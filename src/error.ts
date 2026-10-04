import { defineErrorHandler } from 'nitro'

export default defineErrorHandler((error: any, event: any) => {
  console.error('[Tellnest Server Error Handler]:', error)
  const message = error?.message || (typeof error === 'string' ? error : 'Internal Server Error')
  const stack = error?.stack ? String(error.stack).split('\n').slice(0, 8) : []

  return new Response(
    JSON.stringify(
      {
        error: true,
        status: error?.status || 500,
        message,
        stack,
        url: event?.req?.url || event?.url || '',
      },
      null,
      2
    ),
    {
      status: error?.status || 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
    }
  )
})
