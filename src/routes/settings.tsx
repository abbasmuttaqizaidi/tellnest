import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/settings')({
  beforeLoad: () => {
    // Consolidated: Profile settings, preferences, and app configuration now live unified on /profile
    throw redirect({
      to: '/profile',
      replace: true,
    })
  },
  component: () => null,
})
