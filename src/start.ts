import { createStart, createMiddleware } from '@tanstack/react-start'
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { isbot } from 'isbot'

/**
 * Robust detection of search engine crawlers, social media preview bots,
 * and automated inspection tools (including Google Search Console).
 */
export function isSearchOrSocialBot(userAgent?: string | null): boolean {
  if (!userAgent) return false
  if (isbot(userAgent)) return true
  const lower = userAgent.toLowerCase()
  return (
    lower.includes('googlebot') ||
    lower.includes('google-inspectiontool') ||
    lower.includes('bingbot') ||
    lower.includes('baiduspider') ||
    lower.includes('yandexbot') ||
    lower.includes('duckduckbot') ||
    lower.includes('slurp') ||
    lower.includes('twitterbot') ||
    lower.includes('facebookexternalhit') ||
    lower.includes('linkedinbot') ||
    lower.includes('embedly') ||
    lower.includes('quora link preview') ||
    lower.includes('showyoubot') ||
    lower.includes('outbrain') ||
    lower.includes('pinterest') ||
    lower.includes('applebot') ||
    lower.includes('mediapartners-google') ||
    lower.includes('feedfetcher-google')
  )
}

const baseClerkMiddleware = clerkMiddleware()

/**
 * Bot-resilient Clerk middleware:
 * When connected to development-mode Clerk instances on custom production domains,
 * Clerk attempts a cross-domain handshake redirect (307) to clerk.accounts.dev
 * whenever Accept: text/html is requested without dev browser cookies.
 *
 * Automated crawlers (Googlebot, Bingbot, Google-InspectionTool) do not persist
 * cross-domain handshake cookies, which triggers a recursive redirect loop
 * ("Page is not indexed: Redirect error" in Google Search Console).
 *
 * For verified crawlers, we neutralize the Accept header sent to Clerk
 * so Clerk gracefully grants signed-out guest context, completely preventing the 307 loop
 * and allowing search crawlers to receive a clean 200 OK with full SSR HTML.
 */
const botResilientClerkMiddleware = createMiddleware().server(async ({ request, next }) => {
  const ua = request.headers.get('user-agent')
  if (isSearchOrSocialBot(ua)) {
    const proxyReq = new Proxy(request, {
      get(target, prop, receiver) {
        if (prop === 'headers') {
          const h = new Headers(target.headers)
          h.set('accept', '*/*')
          return h
        }
        return Reflect.get(target, prop, receiver)
      },
    })
    const baseServer = (baseClerkMiddleware as { options: { server: (args: { request: Request; next: (args?: any) => Promise<any> }) => Promise<any> } }).options.server
    return await baseServer({ request: proxyReq, next })
  }

  const baseServer = (baseClerkMiddleware as { options: { server: (args: { request: Request; next: (args?: any) => Promise<any> }) => Promise<any> } }).options.server
  return await baseServer({ request, next })
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [botResilientClerkMiddleware],
  }
})

