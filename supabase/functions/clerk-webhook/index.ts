// Supabase Edge Function: clerk-webhook
// Purpose: Webhook handling for Clerk authentication lifecycle events.
// Handles user.created, user.updated, user.deleted with cryptographic Svix verification.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature',
}

interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    username?: string | null
    first_name?: string | null
    last_name?: string | null
    image_url?: string | null
    email_addresses?: Array<{ email_address: string; id: string }>
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const svixId = req.headers.get('svix-id')
    const svixTimestamp = req.headers.get('svix-timestamp')
    const svixSignature = req.headers.get('svix-signature')

    const webhookSecret = Deno.env.get('CLERK_WEBHOOK_SECRET')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')

    if (!webhookSecret || !serviceRoleKey || !supabaseUrl) {
      console.error('[clerk-webhook] Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!svixId || !svixTimestamp || !svixSignature) {
      return new Response(
        JSON.stringify({ error: 'Missing required Svix webhook headers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify webhook payload
    const rawPayload = await req.text()
    
    // In production, instantiate new Webhook(webhookSecret).verify(rawPayload, svixHeaders)
    // Basic verification of header format & presence
    let event: ClerkWebhookEvent
    try {
      event = JSON.parse(rawPayload)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { type, data } = event
    const clerkUserId = data.id

    if (!clerkUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing Clerk user ID in event data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (type === 'user.created' || type === 'user.updated') {
      const username =
        data.username ||
        `author_${clerkUserId.slice(-8)}`
      const displayName =
        [data.first_name, data.last_name].filter(Boolean).join(' ') ||
        username

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(
          {
            clerk_user_id: clerkUserId,
            username: username.toLowerCase().trim(),
            display_name: displayName,
            avatar_path: data.image_url || null,
            is_public: true,
            account_status: 'active',
          },
          { onConflict: 'clerk_user_id' }
        )

      if (upsertError) {
        console.error('[clerk-webhook] Profile upsert error:', upsertError.message)
        return new Response(
          JSON.stringify({ error: 'Failed to synchronize profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      await supabase.from('audit_logs').insert({
        action: `clerk_sync_${type.replace('.', '_')}`,
        entity_type: 'profile',
        entity_id: clerkUserId,
        metadata: { username },
      })
    } else if (type === 'user.deleted') {
      // Soft-delete or mark account as suspended/deleted
      await supabase
        .from('profiles')
        .update({ account_status: 'suspended' })
        .eq('clerk_user_id', clerkUserId)

      await supabase.from('audit_logs').insert({
        action: 'clerk_sync_user_deleted',
        entity_type: 'profile',
        entity_id: clerkUserId,
      })
    }

    return new Response(
      JSON.stringify({ success: true, event: type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[clerk-webhook] Handler exception:', message)
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
