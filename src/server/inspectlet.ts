import { createServerFn } from '@tanstack/react-start'
import { createAdminClient } from '../lib/supabase/server.ts'
import { supabase } from '../lib/supabase/client.ts'
import { isValidAdminToken } from './admin.ts'

export interface InspectletClientConfig {
  wid: string
  enabled: boolean
  excludedIdentifiers: string[]
}

export interface InspectletExclusionItem {
  id: string
  identifier: string
  reason?: string
  createdAt: string
}

export interface InspectletAdminSettings {
  wid: string
  enabled: boolean
  excludeAdmin: boolean
  exclusions: InspectletExclusionItem[]
}

// In-memory cache for client configuration (60 seconds TTL)
let cachedClientConfig: InspectletClientConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minute

export function invalidateInspectletCache(): void {
  cachedClientConfig = null
  cacheTimestamp = 0
}

/**
 * Get Inspectlet configuration for client tracking.
 * Safe for public consumption. Returns empty/disabled if not configured or disabled.
 */
export async function executeGetInspectletClientConfig(options?: {
  supabaseClient?: any
  skipCache?: boolean
}): Promise<InspectletClientConfig> {
  const now = Date.now()
  if (!options?.skipCache && cachedClientConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedClientConfig
  }

  const defaultWid =
    (typeof process !== 'undefined' &&
      (process.env.VITE_INSPECTLET_WID ||
        process.env.INSPECTLET_WID ||
        process.env.VITE_INSPECTLET_KEY)) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INSPECTLET_WID) ||
    ''

  const client = options?.supabaseClient || supabase

  try {
    const [configRes, exclusionsRes] = await Promise.all([
      client.from('inspectlet_config').select('value').eq('key', 'settings').maybeSingle(),
      client.from('inspectlet_exclusions').select('identifier'),
    ])

    const dbConfig = configRes.data?.value || {}
    const wid = typeof dbConfig.wid === 'string' && dbConfig.wid.trim() ? dbConfig.wid.trim() : defaultWid
    const enabled = dbConfig.enabled !== undefined ? Boolean(dbConfig.enabled) : true

    const excludedIdentifiers: string[] = (exclusionsRes.data || [])
      .map((row: { identifier: string }) => row.identifier?.trim().toLowerCase())
      .filter(Boolean)

    cachedClientConfig = {
      wid,
      enabled,
      excludedIdentifiers,
    }
    cacheTimestamp = now
    return cachedClientConfig
  } catch (err) {
    console.warn('[executeGetInspectletClientConfig] Fallback to environment defaults:', err)
    return {
      wid: defaultWid,
      enabled: true,
      excludedIdentifiers: [],
    }
  }
}

/**
 * Server Function: Fetch client Inspectlet configuration.
 */
export const getInspectletClientConfigServerFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<InspectletClientConfig> => {
    return await executeGetInspectletClientConfig()
  })

/**
 * Fetch full Inspectlet admin configuration and exclusion list.
 */
export async function executeAdminGetInspectletSettings(
  adminToken: string,
  options?: { adminClient?: any }
): Promise<InspectletAdminSettings> {
  if (!isValidAdminToken(adminToken)) {
    throw new Error('Unauthorized: Valid administration key required')
  }

  const admin = options?.adminClient || createAdminClient()

  const defaultWid =
    (typeof process !== 'undefined' &&
      (process.env.VITE_INSPECTLET_WID ||
        process.env.INSPECTLET_WID ||
        process.env.VITE_INSPECTLET_KEY)) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_INSPECTLET_WID) ||
    ''

  const [configRes, exclusionsRes] = await Promise.all([
    admin.from('inspectlet_config').select('value').eq('key', 'settings').maybeSingle(),
    admin
      .from('inspectlet_exclusions')
      .select('id, identifier, reason, created_at')
      .order('created_at', { ascending: false }),
  ])

  const dbConfig = configRes.data?.value || {}
  const wid = typeof dbConfig.wid === 'string' && dbConfig.wid.trim() ? dbConfig.wid.trim() : defaultWid
  const enabled = dbConfig.enabled !== undefined ? Boolean(dbConfig.enabled) : true
  const excludeAdmin = dbConfig.exclude_admin !== undefined ? Boolean(dbConfig.exclude_admin) : true

  const exclusions: InspectletExclusionItem[] = (exclusionsRes.data || []).map((row: any) => ({
    id: row.id,
    identifier: row.identifier,
    reason: row.reason || undefined,
    createdAt: row.created_at,
  }))

  return {
    wid,
    enabled,
    excludeAdmin,
    exclusions,
  }
}

/**
 * Server Function: Fetch full admin settings for Inspectlet.
 */
export const adminGetInspectletSettingsServerFn = createServerFn({ method: 'POST' })
  .validator((params: { adminToken: string }) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    return params
  })
  .handler(async ({ data }): Promise<InspectletAdminSettings> => {
    return await executeAdminGetInspectletSettings(data.adminToken)
  })

/**
 * Toggle account exclusion for Inspectlet recording.
 */
export async function executeAdminToggleInspectletExclusion(
  adminToken: string,
  identifier: string,
  exclude: boolean,
  reason?: string,
  options?: { adminClient?: any }
): Promise<{ success: boolean; identifier: string; excluded: boolean }> {
  if (!isValidAdminToken(adminToken)) {
    throw new Error('Unauthorized: Valid administration key required')
  }

  const cleanIdentifier = identifier.trim().toLowerCase()
  if (!cleanIdentifier) {
    throw new Error('Valid account identifier (clerkUserId, email, or username) is required')
  }

  const admin = options?.adminClient || createAdminClient()

  if (exclude) {
    // 1. Insert/upsert into inspectlet_exclusions table
    const { error: insErr } = await admin
      .from('inspectlet_exclusions')
      .upsert(
        {
          identifier: cleanIdentifier,
          reason: reason || 'Excluded by Administrator',
        },
        { onConflict: 'identifier' }
      )

    if (insErr) {
      console.warn('[executeAdminToggleInspectletExclusion] Upsert error:', insErr)
    }

    // 2. Also flag matching profile's preferences if profile exists
    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, preferences')
        .or(`clerk_user_id.eq.${cleanIdentifier},username.ilike.${cleanIdentifier}`)

      if (profiles && profiles.length > 0) {
        for (const p of profiles) {
          const currentPrefs = p.preferences && typeof p.preferences === 'object' ? p.preferences : {}
          await admin
            .from('profiles')
            .update({
              preferences: {
                ...currentPrefs,
                exclude_inspectlet: true,
              },
            })
            .eq('id', p.id)
        }
      }
    } catch (e) {
      console.warn('[executeAdminToggleInspectletExclusion] Profile preference update failed:', e)
    }
  } else {
    // Remove from inspectlet_exclusions
    await admin
      .from('inspectlet_exclusions')
      .delete()
      .ilike('identifier', cleanIdentifier)

    // Unflag matching profile's preferences if profile exists
    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, preferences')
        .or(`clerk_user_id.eq.${cleanIdentifier},username.ilike.${cleanIdentifier}`)

      if (profiles && profiles.length > 0) {
        for (const p of profiles) {
          const currentPrefs = p.preferences && typeof p.preferences === 'object' ? p.preferences : {}
          const { exclude_inspectlet, ...rest } = currentPrefs as any
          await admin
            .from('profiles')
            .update({
              preferences: rest,
            })
            .eq('id', p.id)
        }
      }
    } catch (e) {
      console.warn('[executeAdminToggleInspectletExclusion] Profile preference removal failed:', e)
    }
  }

  invalidateInspectletCache()
  return { success: true, identifier: cleanIdentifier, excluded: exclude }
}

/**
 * Server Function: Toggle account exclusion for Inspectlet.
 */
export const adminToggleInspectletExclusionServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    adminToken: string
    identifier: string
    exclude: boolean
    reason?: string
  }) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    if (!params.identifier) throw new Error('Identifier is required')
    return params
  })
  .handler(async ({ data }) => {
    return await executeAdminToggleInspectletExclusion(
      data.adminToken,
      data.identifier,
      data.exclude,
      data.reason
    )
  })

/**
 * Update global Inspectlet configuration (WID, enabled status, etc.).
 */
export async function executeAdminUpdateInspectletConfig(
  adminToken: string,
  config: { wid?: string; enabled?: boolean; excludeAdmin?: boolean },
  options?: { adminClient?: any }
): Promise<{ success: boolean; config: { wid: string; enabled: boolean; excludeAdmin: boolean } }> {
  if (!isValidAdminToken(adminToken)) {
    throw new Error('Unauthorized: Valid administration key required')
  }

  const admin = options?.adminClient || createAdminClient()

  // Fetch current config
  const { data: current } = await admin
    .from('inspectlet_config')
    .select('value')
    .eq('key', 'settings')
    .maybeSingle()

  const currentVal = current?.value || {}
  const newVal = {
    wid: config.wid !== undefined ? config.wid.trim() : (currentVal.wid || ''),
    enabled: config.enabled !== undefined ? Boolean(config.enabled) : (currentVal.enabled !== undefined ? Boolean(currentVal.enabled) : true),
    exclude_admin: config.excludeAdmin !== undefined ? Boolean(config.excludeAdmin) : (currentVal.exclude_admin !== undefined ? Boolean(currentVal.exclude_admin) : true),
  }

  await admin.from('inspectlet_config').upsert({
    key: 'settings',
    value: newVal,
    updated_at: new Date().toISOString(),
  })

  invalidateInspectletCache()
  return {
    success: true,
    config: {
      wid: newVal.wid,
      enabled: newVal.enabled,
      excludeAdmin: newVal.exclude_admin,
    },
  }
}

/**
 * Server Function: Update global Inspectlet configuration.
 */
export const adminUpdateInspectletConfigServerFn = createServerFn({ method: 'POST' })
  .validator((params: {
    adminToken: string
    wid?: string
    enabled?: boolean
    excludeAdmin?: boolean
  }) => {
    if (!params.adminToken) throw new Error('Admin authorization token is required')
    return params
  })
  .handler(async ({ data }) => {
    return await executeAdminUpdateInspectletConfig(data.adminToken, {
      wid: data.wid,
      enabled: data.enabled,
      excludeAdmin: data.excludeAdmin,
    })
  })
