import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/compare/wattpad-alternative')({
  beforeLoad: () => {
    throw redirect({
      to: '/wattpad-alternative',
      statusCode: 301,
    })
  },
})
