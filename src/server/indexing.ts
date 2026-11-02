/**
 * HatchPen Search Engine Indexing & Ping Automation Engine
 *
 * Implements real-time indexing velocity for published serialized literature across:
 * 1. Google Indexing API (OAuth2 RS256 JWT -> urlNotifications:publish)
 * 2. IndexNow Protocol (Instant submission to Microsoft Bing, Yandex, Seznam, Naver)
 * 3. Search Engine Sitemap & WebSub RSS Feed Pings (Google, Bing, PubSubHubbub)
 *
 * Invariants:
 * - Non-blocking: Publishing a chapter or work is NEVER blocked or delayed if search engine APIs are slow or down.
 * - Graceful degradation: If Google Cloud credentials are not configured, logs an informative notice and skips cleanly.
 * - Canonical validation: Only indexable URLs under https://hatchpen.com are submitted.
 */

import crypto from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { CANONICAL_BASE_URL, buildSitemapEntries } from './sitemap.ts'
import { isValidAdminToken } from './admin.ts'

export const DEFAULT_INDEXNOW_KEY = 'hatchpen-indexnow-key'
export const INDEXNOW_API_ENDPOINT = 'https://api.indexnow.org/indexnow'
export const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_INDEXING_API_URL = 'https://indexing.googleapis.com/v1/urlNotifications:publish'

export interface IndexingResult {
  engine: 'google' | 'indexnow' | 'sitemap_ping' | 'rss_websub'
  status: 'success' | 'skipped' | 'failed'
  urlCount: number
  urls: string[]
  message?: string
  timestamp: string
  responseDetails?: any
}

export interface GoogleCredentials {
  clientEmail?: string
  privateKey?: string
}

export interface IndexingOptions {
  fetchFn?: typeof fetch
  googleCredentials?: GoogleCredentials
  indexNowKey?: string
  host?: string
  logger?: {
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}

/**
 * Base64URL encoding helper conforming to RFC 7515 (JWT standard)
 */
export function base64UrlEncode(str: string | Buffer): string {
  const buf = Buffer.isBuffer(str) ? str : Buffer.from(str, 'utf-8')
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/**
 * Normalizes and filters a list of URLs ensuring they are canonical HatchPen links.
 */
export function normalizeCanonicalUrls(urls: string | string[], baseHost = CANONICAL_BASE_URL): string[] {
  const rawList = Array.isArray(urls) ? urls : [urls]
  const cleanList: string[] = []

  for (const raw of rawList) {
    if (!raw || typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (!trimmed) continue

    let absolute = trimmed
    if (trimmed.startsWith('/')) {
      absolute = `${baseHost}${trimmed}`
    }

    try {
      const parsed = new URL(absolute)
      const baseParsed = new URL(baseHost)
      if (parsed.hostname === baseParsed.hostname) {
        // Strip trailing slash except for root, remove query params and hash for indexing
        let normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname}`
        if (normalized.length > baseHost.length && normalized.endsWith('/')) {
          normalized = normalized.slice(0, -1)
        }
        if (!cleanList.includes(normalized)) {
          cleanList.push(normalized)
        }
      }
    } catch {}
  }

  return cleanList
}

/**
 * Creates an RS256 signed JWT for Google OAuth2 Service Account authentication.
 */
export function createGoogleServiceAccountJwt(
  clientEmail: string,
  privateKey: string,
  scope = 'https://www.googleapis.com/auth/indexing',
  currentEpochSeconds = Math.floor(Date.now() / 1000)
): string {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const payload = {
    iss: clientEmail,
    scope,
    aud: GOOGLE_OAUTH_TOKEN_URL,
    exp: currentEpochSeconds + 3600,
    iat: currentEpochSeconds,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`

  // Ensure private key handles literal escaped newlines from environment variables
  const formattedKey = privateKey.replace(/\\n/g, '\n')

  const signer = crypto.createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(formattedKey, 'base64url')

  return `${unsignedToken}.${signature}`
}

/**
 * Submits URLs directly to the Google Indexing API.
 */
export async function pingGoogleIndexingApi(
  urls: string[],
  options: IndexingOptions = {}
): Promise<IndexingResult> {
  const fetchFn = options.fetchFn || fetch
  const now = new Date().toISOString()

  // 1. Resolve credentials from options or environment variables
  const clientEmail =
    options.googleCredentials?.clientEmail ||
    process.env.GOOGLE_INDEXING_CLIENT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let privateKey =
    options.googleCredentials?.privateKey ||
    process.env.GOOGLE_INDEXING_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  // Fallback: check if a JSON service account string was provided
  if (!clientEmail || !privateKey) {
    const rawJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || process.env.GOOGLE_INDEXING_CREDENTIALS
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson)
        if (parsed.client_email && parsed.private_key) {
          // Found credentials inside JSON object
          return await pingGoogleIndexingApi(urls, {
            ...options,
            googleCredentials: {
              clientEmail: parsed.client_email,
              privateKey: parsed.private_key,
            },
          })
        }
      } catch {}
    }
  }

  if (!clientEmail || !privateKey) {
    return {
      engine: 'google',
      status: 'skipped',
      urlCount: urls.length,
      urls,
      message:
        'Google Indexing API skipped: GOOGLE_INDEXING_CLIENT_EMAIL and GOOGLE_INDEXING_PRIVATE_KEY are not configured.',
      timestamp: now,
    }
  }

  try {
    // 2. Request short-lived OAuth2 Access Token
    const assertionJwt = createGoogleServiceAccountJwt(clientEmail, privateKey)
    const tokenRes = await fetchFn(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: assertionJwt,
      }).toString(),
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      return {
        engine: 'google',
        status: 'failed',
        urlCount: urls.length,
        urls,
        message: `Google OAuth token exchange failed (HTTP ${tokenRes.status}): ${errorText}`,
        timestamp: now,
      }
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string }
    const accessToken = tokenData?.access_token
    if (!accessToken) {
      return {
        engine: 'google',
        status: 'failed',
        urlCount: urls.length,
        urls,
        message: 'Google OAuth response did not contain access_token',
        timestamp: now,
      }
    }

    // 3. Submit URL notifications
    const responses: any[] = []
    for (const url of urls) {
      const publishRes = await fetchFn(GOOGLE_INDEXING_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          url,
          type: 'URL_UPDATED',
        }),
      })

      const status = publishRes.status
      let body: any = null
      try {
        body = await publishRes.json()
      } catch {
        body = await publishRes.text()
      }

      responses.push({ url, status, body })
    }

    const allSuccessful = responses.every((r) => r.status >= 200 && r.status < 300)

    return {
      engine: 'google',
      status: allSuccessful ? 'success' : 'failed',
      urlCount: urls.length,
      urls,
      message: allSuccessful
        ? `Successfully published ${urls.length} URLs to Google Indexing API`
        : `Published ${urls.length} URLs with some errors`,
      responseDetails: responses,
      timestamp: now,
    }
  } catch (err: any) {
    return {
      engine: 'google',
      status: 'failed',
      urlCount: urls.length,
      urls,
      message: `Google Indexing API unexpected exception: ${err?.message || String(err)}`,
      timestamp: now,
    }
  }
}

/**
 * Submits URLs to the IndexNow protocol (Microsoft Bing, Yandex, Seznam, Naver).
 */
export async function pingIndexNow(
  urls: string[],
  options: IndexingOptions = {}
): Promise<IndexingResult> {
  const fetchFn = options.fetchFn || fetch
  const host = options.host || 'hatchpen.com'
  const key = options.indexNowKey || process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY
  const keyLocation = `https://${host}/${key}.txt`
  const now = new Date().toISOString()

  try {
    const payload = {
      host,
      key,
      keyLocation,
      urlList: urls,
    }

    const res = await fetchFn(INDEXNOW_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    })

    // IndexNow returns 200 (OK) or 202 (Accepted)
    const isOk = res.status === 200 || res.status === 202
    let responseText = ''
    try {
      responseText = await res.text()
    } catch {}

    return {
      engine: 'indexnow',
      status: isOk ? 'success' : 'failed',
      urlCount: urls.length,
      urls,
      message: isOk
        ? `Submitted ${urls.length} URLs to IndexNow (HTTP ${res.status})`
        : `IndexNow submission rejected (HTTP ${res.status}): ${responseText || 'Unknown error'}`,
      timestamp: now,
      responseDetails: { status: res.status, body: responseText },
    }
  } catch (err: any) {
    return {
      engine: 'indexnow',
      status: 'failed',
      urlCount: urls.length,
      urls,
      message: `IndexNow request failed: ${err?.message || String(err)}`,
      timestamp: now,
    }
  }
}

/**
 * Pings Google, Bing, and WebSub for Sitemap and RSS updates.
 */
export async function pingSitemapAndFeeds(options: IndexingOptions = {}): Promise<IndexingResult[]> {
  const fetchFn = options.fetchFn || fetch
  const now = new Date().toISOString()
  const sitemapUrl = encodeURIComponent(`${CANONICAL_BASE_URL}/sitemap.xml`)
  const rssUrl = encodeURIComponent(`${CANONICAL_BASE_URL}/rss.xml`)

  const results: IndexingResult[] = []

  // 1. Ping Bing Sitemap
  try {
    const bingRes = await fetchFn(`https://www.bing.com/ping?sitemap=${sitemapUrl}`, { method: 'GET' })
    results.push({
      engine: 'sitemap_ping',
      status: bingRes.ok ? 'success' : 'failed',
      urlCount: 1,
      urls: [`${CANONICAL_BASE_URL}/sitemap.xml`],
      message: `Bing sitemap ping returned HTTP ${bingRes.status}`,
      timestamp: now,
    })
  } catch (err: any) {
    results.push({
      engine: 'sitemap_ping',
      status: 'failed',
      urlCount: 1,
      urls: [`${CANONICAL_BASE_URL}/sitemap.xml`],
      message: `Bing sitemap ping error: ${err?.message || String(err)}`,
      timestamp: now,
    })
  }

  // 2. Ping Google Sitemap
  try {
    const googleRes = await fetchFn(`https://www.google.com/ping?sitemap=${sitemapUrl}`, { method: 'GET' })
    results.push({
      engine: 'sitemap_ping',
      status: googleRes.ok ? 'success' : 'failed',
      urlCount: 1,
      urls: [`${CANONICAL_BASE_URL}/sitemap.xml`],
      message: `Google sitemap ping returned HTTP ${googleRes.status}`,
      timestamp: now,
    })
  } catch (err: any) {
    results.push({
      engine: 'sitemap_ping',
      status: 'failed',
      urlCount: 1,
      urls: [`${CANONICAL_BASE_URL}/sitemap.xml`],
      message: `Google sitemap ping error: ${err?.message || String(err)}`,
      timestamp: now,
    })
  }

  // 3. Ping PubSubHubbub (WebSub for real-time RSS Feed updates)
  try {
    const webSubRes = await fetchFn('https://pubsubhubbub.appspot.com/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `hub.mode=publish&hub.url=${rssUrl}`,
    })
    results.push({
      engine: 'rss_websub',
      status: webSubRes.status === 204 || webSubRes.ok ? 'success' : 'failed',
      urlCount: 1,
      urls: [`${CANONICAL_BASE_URL}/rss.xml`],
      message: `WebSub hub ping returned HTTP ${webSubRes.status}`,
      timestamp: now,
    })
  } catch (err: any) {
    results.push({
      engine: 'rss_websub',
      status: 'failed',
      urlCount: 1,
      urls: [`${CANONICAL_BASE_URL}/rss.xml`],
      message: `WebSub hub ping error: ${err?.message || String(err)}`,
      timestamp: now,
    })
  }

  return results
}

/**
 * Main Orchestrator: Notifies all supported search engines of newly published or updated URLs.
 * Runs non-blocking across:
 * - Google Indexing API
 * - IndexNow protocol
 * - Search engine sitemaps & WebSub feeds
 */
export async function notifySearchEngines(
  urls: string | string[],
  options: IndexingOptions = {}
): Promise<IndexingResult[]> {
  const logger = options.logger || console
  const cleanUrls = normalizeCanonicalUrls(urls, options.host ? `https://${options.host}` : CANONICAL_BASE_URL)

  if (cleanUrls.length === 0) {
    return []
  }

  try {
    const [googleResult, indexNowResult, sitemapResults] = await Promise.allSettled([
      pingGoogleIndexingApi(cleanUrls, options),
      pingIndexNow(cleanUrls, options),
      pingSitemapAndFeeds(options),
    ])

    const allResults: IndexingResult[] = []

    if (googleResult.status === 'fulfilled') {
      allResults.push(googleResult.value)
      if (googleResult.value.status === 'skipped') {
        logger.info(`[Indexing] ${googleResult.value.message}`)
      } else if (googleResult.value.status === 'success') {
        logger.info(`[Indexing] Google Indexing API successfully updated ${cleanUrls.length} URLs.`)
      } else {
        logger.warn(`[Indexing] Google Indexing API notice: ${googleResult.value.message}`)
      }
    }

    if (indexNowResult.status === 'fulfilled') {
      allResults.push(indexNowResult.value)
      if (indexNowResult.value.status === 'success') {
        logger.info(`[Indexing] IndexNow successfully updated ${cleanUrls.length} URLs.`)
      } else {
        logger.warn(`[Indexing] IndexNow notice: ${indexNowResult.value.message}`)
      }
    }

    if (sitemapResults.status === 'fulfilled') {
      allResults.push(...sitemapResults.value)
    }

    return allResults
  } catch (err: any) {
    logger.warn('[Indexing] notifySearchEngines execution caught error:', err?.message)
    return []
  }
}

/**
 * Server Function: Trigger Indexing Ping manually or from admin desk
 */
export const triggerIndexingPingServerFn = createServerFn({ method: 'POST' })
  .validator((params?: { urls?: string[]; workSlug?: string; chapterSlug?: string }) => {
    return {
      urls: Array.isArray(params?.urls) ? params.urls : [],
      workSlug: typeof params?.workSlug === 'string' ? params.workSlug.trim() : undefined,
      chapterSlug: typeof params?.chapterSlug === 'string' ? params.chapterSlug.trim() : undefined,
    }
  })
  .handler(async ({ data }) => {
    const urlsToPing: string[] = [...(data.urls || [])]

    if (data.workSlug) {
      urlsToPing.push(`${CANONICAL_BASE_URL}/works/${data.workSlug}`)
      if (data.chapterSlug) {
        urlsToPing.push(`${CANONICAL_BASE_URL}/read/${data.workSlug}/${data.chapterSlug}`)
      }
    }

    if (urlsToPing.length === 0) {
      urlsToPing.push(`${CANONICAL_BASE_URL}/discover`)
    }

    return await notifySearchEngines(urlsToPing)
  })

/**
 * Server Function: Bulk submit entire live catalog to IndexNow (Microsoft Bing, Yandex, Seznam, Naver)
 * Queries all current sitemap entries and dispatches them in one request.
 */
export const submitCatalogToIndexNowServerFn = createServerFn({ method: 'POST' })
  .validator((params?: { adminToken?: string }) => {
    return {
      adminToken: typeof params?.adminToken === 'string' ? params.adminToken : '',
    }
  })
  .handler(async ({ data }) => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired admin credentials')
    }

    const entries = await buildSitemapEntries()
    const allUrls = entries.map((e) => e.loc).filter(Boolean)

    const indexNowResult = await pingIndexNow(allUrls)
    const sitemapResults = await pingSitemapAndFeeds()

    return {
      success: indexNowResult.status === 'success',
      totalUrls: allUrls.length,
      indexNow: indexNowResult,
      sitemapPings: sitemapResults,
    }
  })

/**
 * Server Function: Fetch IndexNow configuration and live health for Admin Panel
 */
export const getIndexNowAdminStatusServerFn = createServerFn({ method: 'POST' })
  .validator((params?: { adminToken?: string }) => {
    return {
      adminToken: typeof params?.adminToken === 'string' ? params.adminToken : '',
    }
  })
  .handler(async ({ data }) => {
    if (!isValidAdminToken(data.adminToken)) {
      throw new Error('Unauthorized: Invalid or expired admin credentials')
    }

    const indexNowKey = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY
    const verificationUrl = `${CANONICAL_BASE_URL}/${indexNowKey}.txt`

    let isKeyAccessible = false
    try {
      const checkRes = await fetch(verificationUrl, { method: 'HEAD' })
      isKeyAccessible = checkRes.status === 200
    } catch {
      isKeyAccessible = false
    }

    const entries = await buildSitemapEntries()
    const allUrls = entries.map((e) => e.loc).filter(Boolean)

    return {
      key: indexNowKey,
      verificationUrl,
      isKeyAccessible,
      participatingEngines: ['Microsoft Bing', 'Yandex', 'Seznam.cz', 'Naver'],
      totalIndexedUrlsInSitemap: allUrls.length,
      sampleUrls: allUrls.slice(0, 5),
    }
  })

