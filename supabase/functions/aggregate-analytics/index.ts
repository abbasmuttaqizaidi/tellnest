// Supabase Edge Function: aggregate-analytics
// Purpose: Scheduled / periodic background aggregation processing of raw analytics events into rollup metrics.
// Keeps user-facing catalog and discovery queries sub-millisecond without runtime COUNT(*) aggregates.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Fetch distinct works that had recent activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentEvents, error: eventsError } = await supabase
      .from('analytics_events')
      .select('work_id, event_type')
      .gte('created_at', oneDayAgo)
      .limit(1000)

    if (eventsError) {
      console.error('[aggregate-analytics] Error fetching recent events:', eventsError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to query analytics events' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Compute event count map
    const workEventCounts = new Map<string, { views: number; reads: number }>()
    for (const evt of recentEvents || []) {
      if (!evt.work_id) continue
      const current = workEventCounts.get(evt.work_id) || { views: 0, reads: 0 }
      if (evt.event_type === 'work_view') current.views++
      if (evt.event_type === 'chapter_read') current.reads++
      workEventCounts.set(evt.work_id, current)
    }

    // 3. Increment counters on works table in batch
    let updatedCount = 0
    for (const [workId, counts] of workEventCounts.entries()) {
      if (counts.views > 0) {
        // Query current count
        const { data: work } = await supabase
          .from('works')
          .select('id, view_count')
          .eq('id', workId)
          .single()

        if (work) {
          await supabase
            .from('works')
            .update({ view_count: (work.view_count || 0) + counts.views })
            .eq('id', workId)
          updatedCount++
        }
      }
    }

    // 4. Record audit log of the aggregation run
    await supabase.from('audit_logs').insert({
      action: 'analytics_rollup_aggregation',
      entity_type: 'system',
      entity_id: '00000000-0000-0000-0000-000000000000',
      metadata: {
        eventsProcessed: recentEvents?.length || 0,
        worksUpdated: updatedCount,
        window: '24h',
      },
    })

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: recentEvents?.length || 0,
        worksUpdated: updatedCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown aggregation error'
    console.error('[aggregate-analytics] Exception:', message)
    return new Response(
      JSON.stringify({ error: 'Analytics rollup execution failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
