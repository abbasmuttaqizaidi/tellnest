import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: false,
    defaultPreload: 'intent',
    defaultPreloadDelay: 0,
    defaultPreloadStaleTime: 300_000,
    defaultStaleTime: 300_000,
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
