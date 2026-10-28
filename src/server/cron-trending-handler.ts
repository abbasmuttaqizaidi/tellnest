import { defineHandler } from 'nitro'
import { Receiver } from '@upstash/qstash'
import { executeGenerateTrendingSnapshot } from './trendingEngine.ts'

/**
 * Scheduled Ranking Endpoint for HatchPen Trending V1
 *
 * Route: POST /api/cron/trending-weekly
 * Cadence: Scheduled once every 7 days (e.g. Monday 00:00:00 UTC) via Upstash QStash.
 *
 * Required Staging / Production Environment Variables:
 * - QSTASH_CURRENT_SIGNING_KEY: Current signing key from Upstash Console.
 * - QSTASH_NEXT_SIGNING_KEY: (Optional) Next signing key for zero-downtime key rotation.
 * - QSTASH_DESTINATION_URL: Exact target webhook URL registered in QStash schedule:
 *     e.g., QSTASH_DESTINATION_URL=https://<staging-domain>/api/cron/trending-weekly
 *     (QStash signs the exact scheduled target URL into the JWT 'sub' claim).
 * - CRON_SECRET: Shared secret for secure manual or CLI invocation when signature header is absent.
 *
 * Security & Signature Verification:
 * 1. Primary: Upstash QStash cryptographic signature verification via `@upstash/qstash` Receiver.
 *    FAIL-CLOSED: If upstash-signature is present, any verification failure immediately returns 401.
 * 2. Deliberate fallback: Bearer token or x-cron-secret header against CRON_SECRET.
 *    Only evaluated when upstash-signature header is completely ABSENT.
 */
export default defineHandler({
  fetch: async (req: Request) => {
    // Only allow POST requests for state mutations
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method Not Allowed',
          message: 'Trending snapshot generation must be triggered via POST.',
        }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const upstashSignature = req.headers.get('upstash-signature')
    const authHeader = req.headers.get('authorization')
    const cronSecretHeader = req.headers.get('x-cron-secret')

    const rawBody = await req.text()

    let isAuthorized = false
    let authMethod = 'none'

    // 1. Primary: When an Upstash signature is presented, strictly verify via QStash Receiver.
    // FAIL CLOSED IMMEDIATELY on any signature failure. NEVER fall back to CRON_SECRET if a signature was provided.
    if (upstashSignature) {
      const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY
      const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY || currentSigningKey || ''

      if (!currentSigningKey) {
        console.error('[cron-trending] Missing QSTASH_CURRENT_SIGNING_KEY on server for incoming QStash webhook.')
        return new Response(
          JSON.stringify({
            error: 'Server Misconfiguration',
            message: 'QStash signature header is present, but QSTASH_CURRENT_SIGNING_KEY is not configured on the server.',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      try {
        const receiver = new Receiver({
          currentSigningKey,
          nextSigningKey,
        })

        // Exact target destination URL: prefers explicit QSTASH_DESTINATION_URL environment variable,
        // otherwise reconstructs canonical URL from request headers (x-forwarded-proto, host) falling back to req.url.
        let destinationUrl = process.env.QSTASH_DESTINATION_URL
        if (!destinationUrl) {
          const proto = req.headers.get('x-forwarded-proto') || (req.url.startsWith('https') ? 'https' : 'http')
          const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
          if (host) {
            try {
              const urlObj = new URL(req.url)
              destinationUrl = `${proto}://${host}${urlObj.pathname}${urlObj.search}`
            } catch {
              destinationUrl = req.url
            }
          } else {
            destinationUrl = req.url
          }
        }

        const verified = await receiver.verify({
          signature: upstashSignature,
          body: rawBody,
          url: destinationUrl,
        })

        if (!verified) {
          throw new Error('QStash signature verification returned false.')
        }

        isAuthorized = true
        authMethod = 'qstash-signature'
      } catch (sigErr: any) {
        console.warn('[cron-trending] QStash signature verification failed:', sigErr?.message || sigErr)
        // Strict Fail-Closed: DO NOT fall back to CRON_SECRET when a QStash signature header was presented
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            message: 'Invalid or forged QStash signature. Request rejected fail-closed.',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    } else {
      // 2. Deliberate Fallback: Only evaluated when Upstash signature header is completely ABSENT
      const expectedCronSecret = process.env.CRON_SECRET
      if (expectedCronSecret && expectedCronSecret.trim().length > 0) {
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null
        const secretToken = cronSecretHeader?.trim() || bearerToken

        if (secretToken && secretToken === expectedCronSecret) {
          isAuthorized = true
          authMethod = 'shared-secret'
        }
      }
    }

    if (!isAuthorized) {
      console.warn('[cron-trending] Unauthorized request attempt from client (missing valid credentials).')
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message:
            'Missing valid authorization credentials. Must provide valid Upstash signature or Bearer CRON_SECRET.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    try {
      console.log(`[cron-trending] Triggering weekly trending calculation (auth: ${authMethod})...`)
      const result = await executeGenerateTrendingSnapshot()

      console.log(
        `[cron-trending] Weekly trending snapshot successfully generated: ${result.totalRanked} stories ranked (Tier A: ${result.tierACount}, Tier B: ${result.tierBCount}).`
      )

      return new Response(
        JSON.stringify({
          success: true,
          authMethod,
          snapshotId: result.snapshotId,
          totalRanked: result.totalRanked,
          tierACount: result.tierACount,
          tierBCount: result.tierBCount,
          rankings: result.rankings,
          generatedAt: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    } catch (err: any) {
      console.error('[cron-trending] Error executing weekly snapshot generation:', err)
      return new Response(
        JSON.stringify({
          error: 'Snapshot Generation Failed',
          message: err?.message || 'Internal error during trending ranking calculation.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
  },
})
