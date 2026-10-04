import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

const DEFAULT_SUPABASE_URL = 'https://amplbczsaqtleoshttsb.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtcGxiY3pzYXF0bGVvc2h0dHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzA4NzIsImV4cCI6MjEwNjcwNjg3Mn0.kqgTCieuKAYlAnieUeWAaCT9qnGTEbWgGf-OoKLoFfI'

// Retrieve Supabase environment variables safely across browser and SSR
const rawSupabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
  DEFAULT_SUPABASE_URL

const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
  DEFAULT_ANON_KEY

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-id') &&
  !supabaseAnonKey.includes('your-anon-key')
)

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[Supabase] Missing valid VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Please configure your .env file.'
  )
}

/**
 * Standard Supabase client for client-side and public queries.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

/**
 * Creates a Supabase client authenticated with a Clerk JWT token.
 * Ready for the upcoming Clerk user integration with Row Level Security (RLS).
 *
 * @param clerkToken - JWT token retrieved from Clerk via `getToken({ template: 'supabase' })`
 */
export function createClerkSupabaseClient(clerkToken?: string | null): SupabaseClient<Database> {
  if (!clerkToken) {
    return supabase
  }

  return createClient<Database>(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      global: {
        headers: {
          Authorization: `Bearer ${clerkToken}`,
        },
      },
      auth: {
        persistSession: false,
      },
    }
  )
}
