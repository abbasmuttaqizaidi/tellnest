// Supabase Edge Function: content-moderation
// Purpose: Asynchronous automated content classification and moderation scanning for published works and chapters.
// Isolates CPU/text scanning from the normal reader/writer request path.

import { createClient } from 'jsr:@supabase/supabase-js@2'

interface ModerationPayload {
  targetType: 'work' | 'chapter'
  targetId: string
  content: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Banned patterns and high-severity violations
const PROHIBITED_PATTERNS = [
  /\b(phishing|malware|scam|exploit|doxx)\b/i,
  /\b(hate speech|white supremacy|nazi)\b/i,
  /\b(csam|child abuse|terrorism)\b/i,
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authorize: Ensure request has service-role key or admin auth
    const authHeader = req.headers.get('Authorization')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!authHeader || !serviceRoleKey || !authHeader.includes(serviceRoleKey)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Service-role authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: SUPABASE_URL missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Validate input payload
    const body: ModerationPayload = await req.json()
    if (!body.targetType || !['work', 'chapter'].includes(body.targetType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing targetType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!body.targetId || typeof body.targetId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing targetId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const textToScan = typeof body.content === 'string' ? body.content.slice(0, 100000) : ''

    // 3. Scan content
    const matchedViolations: string[] = []
    for (const pattern of PROHIBITED_PATTERNS) {
      if (pattern.test(textToScan)) {
        matchedViolations.push(pattern.source)
      }
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 4. If flagged, file an automated moderation report and audit log
    if (matchedViolations.length > 0) {
      const { error: reportError } = await supabase
        .from('moderation_reports')
        .insert({
          target_type: body.targetType,
          target_id: body.targetId,
          reason: 'inappropriate',
          description: `Automated content scan detected restricted patterns: ${matchedViolations.join(', ')}`,
          status: 'pending',
        })

      if (reportError) {
        console.error('[content-moderation] Error inserting report:', reportError.message)
      }

      await supabase.from('audit_logs').insert({
        action: 'automated_moderation_flag',
        entity_type: body.targetType,
        entity_id: body.targetId,
        metadata: { violations: matchedViolations },
      })

      return new Response(
        JSON.stringify({
          status: 'flagged',
          targetId: body.targetId,
          action: 'report_created',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Content passed cleanly
    return new Response(
      JSON.stringify({
        status: 'approved',
        targetId: body.targetId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[content-moderation] Exception:', message)
    return new Response(
      JSON.stringify({ error: 'Internal moderation processing failure' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
