import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Creates a server-side Supabase client with the Service Role Key.
 *
 * CAUTION: The Service Role Key bypasses Row Level Security (RLS).
 * Only use this in secure server environments (e.g., TanStack Start server functions,
 * API routes, or Clerk webhook sync handlers).
 */
export function createAdminClient(): SupabaseClient<Database> {
  const rawUrl =
    (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    ''

  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

  const serviceRoleKey =
    (typeof process !== 'undefined' && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
    ''

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      '[Supabase Admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined. Admin operations will fail.'
    )
  }

  return createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceRoleKey || 'placeholder-service-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
