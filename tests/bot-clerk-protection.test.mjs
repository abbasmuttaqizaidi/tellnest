import test from 'node:test'
import assert from 'node:assert/strict'

process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_mockSecretKey123'
process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || 'pk_test_aW52aXRpbmctYm9hLTg5NDIuY2xlcmsuYWNjb3VudHMuZGV2JA'

import { isSearchOrSocialBot } from '../src/start.ts'
import { clerkMiddleware } from '@clerk/tanstack-react-start/server'
import { createMiddleware } from '@tanstack/react-start'

/**
 * Test Suite: Search Bot Crawler & Inspection Tool Verification
 *
 * Guarantees:
 * 1. Correctly classifies search bots (Googlebot, Google-InspectionTool, Bingbot, Twitterbot).
 * 2. Normal desktop/mobile browsers are classified as humans.
 * 3. Bot request proxying neutralizes Accept: text/html to prevent Clerk dev browser 307 handshake loop.
 */

test('Search Bot Classifier: Identifies search and preview bots reliably', () => {
  const bots = [
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/W.X.Y.Z Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko; compatible; Google-InspectionTool/1.0; mobile) Chrome/W.X.Y.Z Mobile Safari/537.36',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'Twitterbot/1.0',
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
    'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
    'DuckDuckBot/1.0; (+http://duckduckgo.com/duckduckbot.html)',
  ]

  for (const ua of bots) {
    assert.equal(isSearchOrSocialBot(ua), true, `Must recognize ${ua} as bot`)
  }
})

test('Search Bot Classifier: Distinguishes real human browsers', () => {
  const humans = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0',
  ]

  for (const ua of humans) {
    assert.equal(isSearchOrSocialBot(ua), false, `Must recognize ${ua} as human`)
  }

  assert.equal(isSearchOrSocialBot(null), false)
  assert.equal(isSearchOrSocialBot(''), false)
})

test('Clerk Bot Protection: Prevents 307 handshake loop on bot requests', async () => {
  const baseClerk = clerkMiddleware()

  const botReq = new Request('https://hatchpen.com/', {
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'accept': 'text/html,application/xhtml+xml',
    },
  })

  // Apply our proxy pattern
  const proxyReq = new Proxy(botReq, {
    get(target, prop, receiver) {
      if (prop === 'headers') {
        const h = new Headers(target.headers)
        h.set('accept', '*/*')
        return h
      }
      return Reflect.get(target, prop, receiver)
    },
  })

  let nextCalled = false
  const mockNext = async () => {
    nextCalled = true
    return { response: new Response('<html>Bot SSR OK</html>', { status: 200 }) }
  }

  const result = await baseClerk.options.server({
    request: proxyReq,
    next: mockNext,
  })

  assert.equal(nextCalled, true, 'Next must be called directly without throwing 307')
  assert.equal(result.response.status, 200, 'Must return 200 OK for Googlebot')
})
