import { defineHandler } from 'nitro'
import { notifySearchEngines, DEFAULT_INDEXNOW_KEY, type IndexingResult } from './indexing.ts'
import { CANONICAL_BASE_URL } from './sitemap.ts'

export default defineHandler({
  fetch: async (req: Request) => {
    const url = new URL(req.url)

    // GET /api/indexing/ping: Status report of indexing configuration
    if (req.method === 'GET') {
      const hasGoogleEmail = Boolean(
        process.env.GOOGLE_INDEXING_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      )
      const hasGoogleKey = Boolean(
        process.env.GOOGLE_INDEXING_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
      )
      const indexNowKey = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY

      return new Response(
        JSON.stringify({
          status: 'ok',
          service: 'HatchPen Search Engine Indexing & Ping Automation',
          canonicalBase: CANONICAL_BASE_URL,
          engines: {
            googleIndexingApi: {
              configured: hasGoogleEmail && hasGoogleKey,
              clientEmailConfigured: hasGoogleEmail,
              privateKeyConfigured: hasGoogleKey,
              mode: hasGoogleEmail && hasGoogleKey ? 'active' : 'fallback-skipped',
            },
            indexNow: {
              configured: true,
              activeKey: indexNowKey,
              verificationUrl: `${CANONICAL_BASE_URL}/${indexNowKey}.txt`,
              participatingEngines: ['Bing', 'Yandex', 'Seznam', 'Naver'],
            },
            sitemapPings: {
              configured: true,
              targets: ['Google', 'Bing', 'WebSub (PubSubHubbub)'],
              sitemapUrl: `${CANONICAL_BASE_URL}/sitemap.xml`,
              rssUrl: `${CANONICAL_BASE_URL}/rss.xml`,
            },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // POST /api/indexing/ping: Trigger manual / webhook indexing ping
    if (req.method === 'POST') {
      const authHeader = req.headers.get('authorization')
      const cronSecretHeader = req.headers.get('x-cron-secret')
      const envCronSecret = process.env.CRON_SECRET

      // If CRON_SECRET is configured, enforce authorization
      if (envCronSecret) {
        const bearerMatch = authHeader?.startsWith('Bearer ') && authHeader.slice(7).trim() === envCronSecret
        const headerMatch = cronSecretHeader && cronSecretHeader.trim() === envCronSecret

        if (!bearerMatch && !headerMatch) {
          return new Response(
            JSON.stringify({
              error: 'Unauthorized',
              message: 'Invalid or missing CRON_SECRET credentials.',
            }),
            {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      }

      let targetUrls: string[] = []
      try {
        const bodyText = await req.text()
        if (bodyText && bodyText.trim()) {
          const parsed = JSON.parse(bodyText)
          if (Array.isArray(parsed.urls)) {
            targetUrls = parsed.urls
          } else if (typeof parsed.url === 'string') {
            targetUrls = [parsed.url]
          }
        }
      } catch {}

      if (targetUrls.length === 0) {
        targetUrls = [`${CANONICAL_BASE_URL}/discover`, `${CANONICAL_BASE_URL}/sitemap.xml`]
      }

      const results = await notifySearchEngines(targetUrls)

      return new Response(
        JSON.stringify({
          success: true,
          submittedUrls: targetUrls,
          results,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  },
})
