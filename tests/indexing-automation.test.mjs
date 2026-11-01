import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeCanonicalUrls,
  createGoogleServiceAccountJwt,
  pingGoogleIndexingApi,
  pingIndexNow,
  pingSitemapAndFeeds,
  notifySearchEngines,
  DEFAULT_INDEXNOW_KEY,
} from '../src/server/indexing.ts'
import { CANONICAL_BASE_URL } from '../src/server/sitemap.ts'
import indexingHandler from '../src/server/indexing-handler.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

test('Indexing Automation: normalizeCanonicalUrls filters, deduplicates, and standardizes URLs', () => {
  const input = [
    'https://hatchpen.com/works/the-night-i-forgot-you/',
    '/works/the-night-i-forgot-you',
    'https://hatchpen.com/read/the-night-i-forgot-you/chapter-1?source=share#quote',
    'https://evil-phishing.com/stolen-work',
    '',
    null,
    undefined,
    'https://hatchpen.com/discover',
  ]

  const normalized = normalizeCanonicalUrls(input)

  assert.deepEqual(normalized, [
    'https://hatchpen.com/works/the-night-i-forgot-you',
    'https://hatchpen.com/read/the-night-i-forgot-you/chapter-1',
    'https://hatchpen.com/discover',
  ])
})

test('Indexing Automation: createGoogleServiceAccountJwt generates valid signed RS256 token', () => {
  // Generate a test 2048-bit RSA key pair
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  const clientEmail = 'hatchpen-indexer@test-project.iam.gserviceaccount.com'
  const token = createGoogleServiceAccountJwt(clientEmail, privateKey, 'https://www.googleapis.com/auth/indexing', 1700000000)

  assert.ok(token, 'Token must not be empty')
  const parts = token.split('.')
  assert.equal(parts.length, 3, 'JWT must have 3 dot-separated parts')

  // Decode header and payload
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'))
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))

  assert.equal(header.alg, 'RS256')
  assert.equal(header.typ, 'JWT')
  assert.equal(payload.iss, clientEmail)
  assert.equal(payload.scope, 'https://www.googleapis.com/auth/indexing')
  assert.equal(payload.aud, 'https://oauth2.googleapis.com/token')
  assert.equal(payload.iat, 1700000000)
  assert.equal(payload.exp, 1700000000 + 3600)
})

test('Indexing Automation: pingGoogleIndexingApi gracefully skips when credentials are not configured', async () => {
  const result = await pingGoogleIndexingApi(
    ['https://hatchpen.com/works/new-story'],
    {
      googleCredentials: { clientEmail: '', privateKey: '' },
    }
  )

  assert.equal(result.engine, 'google')
  assert.equal(result.status, 'skipped')
  assert.ok(result.message?.includes('not configured'))
})

test('Indexing Automation: pingGoogleIndexingApi successfully exchanges token and submits URL_UPDATED', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  const clientEmail = 'indexer@hatchpen.iam.gserviceaccount.com'
  const submittedCalls = []

  const mockFetch = async (url, options) => {
    submittedCalls.push({ url, options })

    // Step 1: OAuth token response
    if (url === 'https://oauth2.googleapis.com/token') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'mock-google-token-xyz', expires_in: 3600 }),
      }
    }

    // Step 2: Indexing publish response
    if (url === 'https://indexing.googleapis.com/v1/urlNotifications:publish') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          urlNotificationMetadata: {
            url: JSON.parse(options.body).url,
            latestUpdate: { type: 'URL_UPDATED', notifyTime: '2026-11-02T00:00:00Z' },
          },
        }),
      }
    }

    throw new Error(`Unexpected mock URL: ${url}`)
  }

  const result = await pingGoogleIndexingApi(
    ['https://hatchpen.com/works/test-story'],
    {
      fetchFn: mockFetch,
      googleCredentials: { clientEmail, privateKey },
    }
  )

  assert.equal(result.engine, 'google')
  assert.equal(result.status, 'success')
  assert.equal(result.urlCount, 1)
  assert.equal(submittedCalls.length, 2)
  assert.equal(submittedCalls[0].url, 'https://oauth2.googleapis.com/token')
  assert.equal(submittedCalls[1].url, 'https://indexing.googleapis.com/v1/urlNotifications:publish')
  assert.equal(submittedCalls[1].options.headers.Authorization, 'Bearer mock-google-token-xyz')
})

test('Indexing Automation: pingIndexNow formats standard payload and handles 200/202 responses', async () => {
  let capturedPayload = null
  let capturedHeaders = null

  const mockFetch = async (url, options) => {
    capturedPayload = JSON.parse(options.body)
    capturedHeaders = options.headers
    return {
      status: 200,
      text: async () => 'OK',
    }
  }

  const result = await pingIndexNow(
    ['https://hatchpen.com/works/story-one', 'https://hatchpen.com/read/story-one/chapter-1'],
    {
      fetchFn: mockFetch,
      host: 'hatchpen.com',
      indexNowKey: 'test-custom-key',
    }
  )

  assert.equal(result.engine, 'indexnow')
  assert.equal(result.status, 'success')
  assert.equal(capturedPayload.host, 'hatchpen.com')
  assert.equal(capturedPayload.key, 'test-custom-key')
  assert.equal(capturedPayload.keyLocation, 'https://hatchpen.com/test-custom-key.txt')
  assert.deepEqual(capturedPayload.urlList, [
    'https://hatchpen.com/works/story-one',
    'https://hatchpen.com/read/story-one/chapter-1',
  ])
  assert.ok(capturedHeaders['Content-Type'].includes('application/json'))
})

test('Indexing Automation: pingSitemapAndFeeds pings Bing, Google, and WebSub RSS Hub', async () => {
  const pingedUrls = []

  const mockFetch = async (url) => {
    pingedUrls.push(url)
    return {
      ok: true,
      status: 200,
    }
  }

  const results = await pingSitemapAndFeeds({ fetchFn: mockFetch })

  assert.equal(results.length, 3)
  assert.ok(pingedUrls.some((u) => u.includes('bing.com/ping?sitemap=')))
  assert.ok(pingedUrls.some((u) => u.includes('google.com/ping?sitemap=')))
  assert.ok(pingedUrls.some((u) => u.includes('pubsubhubbub.appspot.com')))
  assert.ok(results.every((r) => r.status === 'success'))
})

test('Indexing Automation: notifySearchEngines aggregates all engines in parallel without throwing', async () => {
  const mockFetch = async (url) => {
    if (url.includes('oauth2') || url.includes('googleapis')) {
      return { ok: true, status: 200, json: async () => ({ access_token: 'tok' }) }
    }
    return { ok: true, status: 200, text: async () => 'OK' }
  }

  const results = await notifySearchEngines(
    ['/works/pleasure-after-dark'],
    {
      fetchFn: mockFetch,
      googleCredentials: { clientEmail: '', privateKey: '' }, // tests graceful skipping of Google while IndexNow/Sitemap succeed
    }
  )

  assert.ok(results.length >= 3, 'Must return results for Google, IndexNow, and Sitemap/Feed pings')
  const googleRes = results.find((r) => r.engine === 'google')
  const indexNowRes = results.find((r) => r.engine === 'indexnow')

  assert.equal(googleRes?.status, 'skipped')
  assert.equal(indexNowRes?.status, 'success')
})

test('Indexing Automation: /api/indexing/ping endpoint responds to GET with configuration status', async () => {
  const req = new Request('https://hatchpen.com/api/indexing/ping', { method: 'GET' })
  const res = await indexingHandler.fetch(req)

  assert.equal(res.status, 200)
  const data = await res.json()
  assert.equal(data.status, 'ok')
  assert.equal(data.service, 'HatchPen Search Engine Indexing & Ping Automation')
  assert.ok(data.engines.indexNow.configured)
  assert.ok(data.engines.sitemapPings.configured)
  assert.equal(data.engines.indexNow.activeKey, DEFAULT_INDEXNOW_KEY)
})

test('Indexing Automation: Writer publication triggers non-blocking search engine notification', () => {
  const writerCode = fs.readFileSync(path.join(rootDir, 'src/server/writer.ts'), 'utf-8')

  assert.ok(
    writerCode.includes("import { notifySearchEngines } from './indexing.ts'"),
    'writer.ts must import notifySearchEngines'
  )
  assert.ok(
    writerCode.includes('notifySearchEngines([chapterUrl, workUrl])'),
    'writer.ts must notify search engines when chapter is published'
  )
  assert.ok(
    writerCode.includes('notifySearchEngines([workUrl])'),
    'writer.ts must notify search engines when manuscript is published'
  )
})

test('Indexing Automation: Static verification key exists in public directory for IndexNow bot validation', () => {
  const keyPath = path.join(rootDir, 'public/hatchpen-indexnow-key.txt')
  assert.ok(fs.existsSync(keyPath), 'public/hatchpen-indexnow-key.txt must exist')
  const content = fs.readFileSync(keyPath, 'utf-8').trim()
  assert.equal(content, DEFAULT_INDEXNOW_KEY)
})
