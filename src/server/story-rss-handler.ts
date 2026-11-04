import { defineHandler } from 'nitro'
import { generateStoryRssXml } from './rss.ts'

export default defineHandler(async (event) => {
  // Extract workId / slug from Nitro params or URL pathname
  const params = (event.context as any)?.params
  const rawParam = params?.workId || ''
  const pathname = new URL(event.node?.req?.url || (event as any).path || '/', 'https://hatchpen.com').pathname
  const pathMatch = pathname.match(/^\/rss\/([^/?#]+)/)
  const candidate = rawParam || (pathMatch ? pathMatch[1] : '')
  const workSlug = decodeURIComponent(candidate).replace(/\.xml$/i, '').trim()

  if (!workSlug) {
    return new Response('Manuscript identifier is required', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const xml = await generateStoryRssXml(workSlug)

  if (!xml) {
    return new Response('Manuscript feed not found or content is not public', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=60',
      },
    })
  }

  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400',
    },
  })
})
