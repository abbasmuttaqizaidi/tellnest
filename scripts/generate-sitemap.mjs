/**
 * HatchPen Sitemap Generation Script
 * Run via: node scripts/generate-sitemap.mjs
 *
 * Generates an up-to-date, mock-free public/sitemap.xml adhering strictly to
 * the 16 canonical categories and 33 canonical genres, and querying live public works.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateSitemapXml } from '../src/server/sitemap.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const sitemapPath = path.join(rootDir, 'public', 'sitemap.xml')

async function run() {
  console.log('[generate-sitemap] Generating fresh canonical sitemap.xml...')
  try {
    const xml = await generateSitemapXml()
    fs.writeFileSync(sitemapPath, xml, 'utf-8')
    console.log(`[generate-sitemap] Successfully wrote sitemap to ${sitemapPath}`)
  } catch (err) {
    console.error('[generate-sitemap] Failed to generate sitemap:', err)
    process.exit(1)
  }
}

run()
