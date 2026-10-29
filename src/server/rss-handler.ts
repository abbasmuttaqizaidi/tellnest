import { defineHandler } from 'nitro'
import { generateRssXml } from './rss.ts'

export default defineHandler(async () => {
  const xml = await generateRssXml()
  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
})
