import { defineHandler } from 'nitro'
import { generateOgSvgCard } from '../lib/og.ts'

export default defineHandler(async (event) => {
  const url = new URL(event.node.req.url || '/', 'https://hatchpen.com')
  const title = url.searchParams.get('title') || 'HatchPen Stories'
  const author = url.searchParams.get('author') || undefined
  const genre = url.searchParams.get('genre') || undefined
  const category = url.searchParams.get('category') || undefined
  const cover = url.searchParams.get('cover') || undefined

  const svg = generateOgSvgCard({
    title,
    author,
    genre,
    category,
    cover,
  })

  return new Response(svg, {
    status: 200,
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
    },
  })
})
