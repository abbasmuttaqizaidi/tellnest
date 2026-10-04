import { useEffect, useRef } from 'react'
import { useUser, useAuth } from '@clerk/react'
import { syncClerkUserToProfile } from '../lib/supabase/queries/authors'
import { createClerkSupabaseClient } from '../lib/supabase/client'

/**
 * ClerkSync Component
 * Automatically synchronizes authenticated Clerk users with the Supabase `profiles` table
 * and attaches the Clerk JWT session token for Supabase Row Level Security (RLS).
 */
export function ClerkSync() {
  const { user, isLoaded: isUserLoaded, isSignedIn } = useUser()
  const { getToken } = useAuth()
  const lastSyncedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isUserLoaded || !isSignedIn || !user) return

    // Avoid redundant syncs within the same session
    if (lastSyncedIdRef.current === user.id) return

    async function sync() {
      try {
        const username =
          user.username ||
          user.primaryEmailAddress?.emailAddress?.split('@')[0]?.replace(/[^a-z0-9_]/gi, '')?.toLowerCase() ||
          `user_${user.id.slice(0, 8)}`

        const displayName =
          user.fullName ||
          user.firstName ||
          user.username ||
          'Tellnest Author'

        // 1. Sync User into Supabase `profiles` table
        await syncClerkUserToProfile({
          clerkUserId: user.id,
          username,
          displayName,
          avatarUrl: user.imageUrl,
        })

        lastSyncedIdRef.current = user.id

        // 2. Obtain Clerk JWT for Supabase RLS (if Supabase JWT template is configured)
        try {
          const supabaseToken = await getToken({ template: 'supabase' })
          if (supabaseToken) {
            createClerkSupabaseClient(supabaseToken)
          }
        } catch (jwtErr) {
          // JWT template may be pending configuration in Clerk dashboard
        }
      } catch (err) {
        console.error('[ClerkSync] Failed to sync user profile with Supabase:', err)
      }
    }

    sync()
  }, [user, isUserLoaded, isSignedIn, getToken])

  // Proactively remove Clerk Development Mode banner from the DOM
  useEffect(() => {
    if (typeof document === 'undefined') return

    const hideBadge = () => {
      const selectors = [
        '#clerk-dev-badge',
        '[data-clerk-dev-badge]',
        '.cl-dev-badge',
        '.cl-dev-mode-badge',
        '.cl-development-badge',
        '.cl-clerk-branding',
        '.cl-clerkBranding',
        '.cl-footer',
        '.cl-footerAction',
        'div[aria-label="Development mode"]',
        '[data-localization-key*="developmentMode"]',
        '[data-localization-key*="devMode"]',
        'div[class*="cl-badge"]',
        'div[class*="development-badge"]',
      ].join(', ')

      const candidates = document.querySelectorAll(selectors)
      candidates.forEach((el) => {
        ;(el as HTMLElement).style.setProperty('display', 'none', 'important')
        ;(el as HTMLElement).style.setProperty('visibility', 'hidden', 'important')
        ;(el as HTMLElement).style.setProperty('height', '0', 'important')
        ;(el as HTMLElement).style.setProperty('opacity', '0', 'important')
      })

      // Piercing shadow roots if any host elements exist
      document.querySelectorAll('*').forEach((node) => {
        if (node.shadowRoot) {
          try {
            const shadowCandidates = node.shadowRoot.querySelectorAll(selectors)
            shadowCandidates.forEach((el) => {
              ;(el as HTMLElement).style.setProperty('display', 'none', 'important')
              ;(el as HTMLElement).style.setProperty('visibility', 'hidden', 'important')
              ;(el as HTMLElement).style.setProperty('height', '0', 'important')
              ;(el as HTMLElement).style.setProperty('opacity', '0', 'important')
            })
          } catch (e) {}
        }
      })

      // Any standalone text element saying "Development mode"
      document.querySelectorAll('span, p, div').forEach((el) => {
        if (el.children.length === 0 && el.textContent?.trim() === 'Development mode') {
          ;(el as HTMLElement).style.setProperty('display', 'none', 'important')
          ;(el as HTMLElement).style.setProperty('visibility', 'hidden', 'important')
          ;(el as HTMLElement).style.setProperty('height', '0', 'important')
          ;(el as HTMLElement).style.setProperty('opacity', '0', 'important')
        }
      })
    }

    hideBadge()
    const interval = setInterval(hideBadge, 300)
    const timeout = setTimeout(() => clearInterval(interval), 5000)

    const observer = new MutationObserver(hideBadge)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
      observer.disconnect()
    }
  }, [])

  return null
}
