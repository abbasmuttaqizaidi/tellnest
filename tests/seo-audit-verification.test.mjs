import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()

test('SEO Audit Fix 1: Zero broken /authors/ links in src', () => {
  const checkDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        checkDir(fullPath)
      } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        assert.ok(
          !content.includes('to="/authors/'),
          `File ${fullPath} contains broken route to="/authors/". Must use canonical to="/author/"`
        )
      }
    }
  }
  checkDir(path.join(rootDir, 'src'))
})

test('SEO Audit Fix 2: Root meta provides absolute og:image and twitter:image URLs', () => {
  const rootContent = fs.readFileSync(path.join(rootDir, 'src/routes/__root.tsx'), 'utf-8')
  assert.ok(
    rootContent.includes("content: 'https://hatchpen.com/og-image.png'"),
    '__root.tsx must use absolute https://hatchpen.com/og-image.png for og:image and twitter:image'
  )
  assert.ok(
    !rootContent.includes("content: '/og-image.png'"),
    '__root.tsx must not use relative /og-image.png'
  )
})

test('SEO Audit Fix 3: HatchPen Hits heading hierarchy and canonical author links', () => {
  const hitsContent = fs.readFileSync(path.join(rootDir, 'src/routes/hatchpen-hits.tsx'), 'utf-8')
  assert.ok(
    hitsContent.includes('<h1 className="sr-only">HatchPen Hits — Curated Serialized Stories & Bestsellers</h1>'),
    'hatchpen-hits.tsx must contain a landmark page-level <h1>'
  )
  assert.ok(
    hitsContent.includes('to="/author/$authorId"'),
    'hatchpen-hits.tsx must link to canonical /author/$authorId'
  )
  assert.ok(
    !hitsContent.includes('to="/authors/$authorId"'),
    'hatchpen-hits.tsx must not contain /authors/$authorId'
  )
})

test('SEO Audit Fix 4: Homepage SSR single h1 invariant (PublicMobileStories uses h2)', () => {
  const mobileContent = fs.readFileSync(path.join(rootDir, 'src/components/PublicMobileStories.tsx'), 'utf-8')
  assert.ok(
    mobileContent.includes('<h2 className="font-serif text-[30px]'),
    'PublicMobileStories must use <h2> to avoid duplicate competing <h1> with PublicHome on SSR'
  )
})

test('SEO Audit Fix 5: W3C HTML5 compliance: RouteHeader does not nest h1 inside button', () => {
  const headerContent = fs.readFileSync(path.join(rootDir, 'src/components/RouteHeader.tsx'), 'utf-8')
  assert.ok(
    !headerContent.includes('<h1'),
    'RouteHeader must not render <h1> inside interactive button element'
  )
})

test('SEO Audit Fix 6: Robots.txt protects private routes and crawl budget', () => {
  const robots = fs.readFileSync(path.join(rootDir, 'public/robots.txt'), 'utf-8')
  assert.ok(robots.includes('Disallow: /write'), 'robots.txt must disallow /write')
  assert.ok(robots.includes('Disallow: /search'), 'robots.txt must disallow /search')
  assert.ok(robots.includes('Disallow: /profile'), 'robots.txt must disallow /profile')
  assert.ok(robots.includes('Disallow: /following'), 'robots.txt must disallow /following')
  assert.ok(robots.includes('Disallow: /admin-work-editor/'), 'robots.txt must disallow /admin-work-editor/')
  assert.ok(robots.includes('Allow: /tag/'), 'robots.txt must allow /tag/')
  assert.ok(robots.includes('Allow: /browse/'), 'robots.txt must allow /browse/')
  assert.ok(robots.includes('Allow: /hatchpen-hits'), 'robots.txt must allow /hatchpen-hits')
})

test('SEO Audit Fix 7: Sitewide Sitelinks Schema preserves intended 5 brand targets', () => {
  const rootContent = fs.readFileSync(path.join(rootDir, 'src/routes/__root.tsx'), 'utf-8')
  assert.ok(rootContent.includes('https://hatchpen.com/works/the-season-we-fell'), 'Must preserve The Season We Fell')
  assert.ok(rootContent.includes('https://hatchpen.com/wattpad-alternative'), 'Must preserve Wattpad Alternative')
  assert.ok(rootContent.includes('https://hatchpen.com/writing-contests'), 'Must preserve Writing Contests')
  assert.ok(rootContent.includes('https://hatchpen.com/discover'), 'Must preserve Discover Stories')
  assert.ok(rootContent.includes('https://hatchpen.com/hatchpen-hits'), 'Must preserve HatchPen Hits')
})

test('SEO Audit Fix 8: Header renders primary crawler links for sitelink hubs', () => {
  const headerContent = fs.readFileSync(path.join(rootDir, 'src/components/Header.tsx'), 'utf-8')
  assert.ok(headerContent.includes('to="/hatchpen-hits"'), 'Header must link /hatchpen-hits')
  assert.ok(headerContent.includes('to="/writing-contests"'), 'Header must link /writing-contests')
  assert.ok(headerContent.includes('to="/discover"'), 'Header must link /discover')
})

test('SEO Audit Fix 9: Login page remains indexed with simplified utility metadata', () => {
  const loginContent = fs.readFileSync(path.join(rootDir, 'src/routes/login.tsx'), 'utf-8')
  assert.ok(!loginContent.includes('noindex: true'), 'Login page must not be deindexed')
  assert.ok(!loginContent.includes("name: 'Sign In to HatchPen'"), 'Login page must not declare heavy standalone webPage schema')
})
