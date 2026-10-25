import { defineHandler } from 'nitro'
import { generateSitemapXml } from './sitemap.ts'

export default defineHandler(async () => {
  const xml = await generateSitemapXml()
  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
})
