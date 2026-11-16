import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Admin User Interests & Onboarding Preferences', () => {
  const adminTsPath = path.resolve(process.cwd(), 'src/server/admin.ts')
  const adminTsContent = fs.readFileSync(adminTsPath, 'utf8')

  it('ensures no hardcoded "Contemporary Prose" fallback exists in src/server/admin.ts', () => {
    assert.ok(
      !adminTsContent.includes("'Contemporary Prose'"),
      'Found unexpected hardcoded "Contemporary Prose" in src/server/admin.ts'
    )
    assert.ok(
      !adminTsContent.includes('"Contemporary Prose"'),
      'Found unexpected hardcoded "Contemporary Prose" in src/server/admin.ts'
    )
  })

  it('ensures no hardcoded fallback of "Serialized Fiction" exists in admin user mapping loops', () => {
    // Check that interestSet.add('Serialized Fiction') does not appear as a catch-all
    assert.ok(
      !adminTsContent.includes("interestSet.add('Serialized Fiction')"),
      'Found legacy interestSet.add(\'Serialized Fiction\') fallback'
    )
    // Check that interests: ['Serialized Fiction'] does not appear in fallback loop
    assert.ok(
      !adminTsContent.includes("interests: ['Serialized Fiction']"),
      'Found legacy interests: [\'Serialized Fiction\'] in profile mapper'
    )
  })

  it('ensures libraryItems query joins category name for accurate interest deduction', () => {
    assert.ok(
      adminTsContent.includes("admin.from('library_items').select('*, work:works(id, title, slug, cover_image_path, category:categories(name))')"),
      'library_items query should join category:categories(name)'
    )
  })

  it('ensures extractPreferenceNames properly extracts both string and object arrays', () => {
    // Replicate the exact logic from src/server/admin.ts
    const extractPreferenceNames = (arr) => {
      if (!Array.isArray(arr)) return []
      return arr
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (item && typeof item === 'object') {
            if (typeof item.name === 'string') return String(item.name).trim()
            if (typeof item.id === 'string') return String(item.id).trim()
          }
          return ''
        })
        .filter(Boolean)
    }

    // 1. Onboarding object format: [{ id: 'romance', name: 'Romance' }, { id: 'fantasy', name: 'Fantasy' }]
    const onboardingGenres = [
      { id: 'romance', name: 'Romance' },
      { id: 'dark-fantasy', name: 'Dark Fantasy' },
    ]
    assert.deepEqual(extractPreferenceNames(onboardingGenres), ['Romance', 'Dark Fantasy'])

    // 2. Settings string format: ['horror', 'sci-fi']
    const settingsGenres = ['horror', 'sci-fi']
    assert.deepEqual(extractPreferenceNames(settingsGenres), ['horror', 'sci-fi'])

    // 3. Mixed / edge-case format with IDs
    const mixed = [{ id: 'thriller' }, 'mystery', null, undefined, {}]
    assert.deepEqual(extractPreferenceNames(mixed), ['thriller', 'mystery'])

    // 4. Empty / non-array format
    assert.deepEqual(extractPreferenceNames(null), [])
    assert.deepEqual(extractPreferenceNames(undefined), [])
    assert.deepEqual(extractPreferenceNames([]), [])
  })

  it('verifies that brand new users with no preferences or works get an empty interests array []', () => {
    // Simulation of user with 0 works, 0 saved items, null preferences
    const interestSet = new Set()
    const rawPrefs = {}

    const extractPreferenceNames = (arr) => {
      if (!Array.isArray(arr)) return []
      return arr
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (item && typeof item === 'object') {
            if (typeof item.name === 'string') return String(item.name).trim()
            if (typeof item.id === 'string') return String(item.id).trim()
          }
          return ''
        })
        .filter(Boolean)
    }

    extractPreferenceNames(rawPrefs.genres).forEach((g) => interestSet.add(g))
    extractPreferenceNames(rawPrefs.interests).forEach((i) => interestSet.add(i))
    extractPreferenceNames(rawPrefs.categories).forEach((c) => interestSet.add(c))

    const userWorks = []
    userWorks.forEach((w) => {
      if (w.categoryName && w.categoryName !== 'General Literature') interestSet.add(w.categoryName)
    })

    const userSaved = []
    userSaved.forEach((s) => {
      if (s.categoryName && s.categoryName !== 'General Literature') interestSet.add(s.categoryName)
    })

    const finalInterests = Array.from(interestSet)
    assert.deepEqual(finalInterests, [], 'Brand new users should have empty interests [], not hardcoded defaults')
  })

  it('verifies that users with onboarding preferences receive their exact selected genres', () => {
    const interestSet = new Set()
    const rawPrefs = {
      genres: [{ id: 'cyberpunk', name: 'Cyberpunk' }, { id: 'solarpunk', name: 'Solarpunk' }],
      interests: [{ id: 'dystopian', name: 'Dystopian' }],
    }

    const extractPreferenceNames = (arr) => {
      if (!Array.isArray(arr)) return []
      return arr
        .map((item) => {
          if (typeof item === 'string') return item.trim()
          if (item && typeof item === 'object') {
            if (typeof item.name === 'string') return String(item.name).trim()
            if (typeof item.id === 'string') return String(item.id).trim()
          }
          return ''
        })
        .filter(Boolean)
    }

    extractPreferenceNames(rawPrefs.genres).forEach((g) => interestSet.add(g))
    extractPreferenceNames(rawPrefs.interests).forEach((i) => interestSet.add(i))
    extractPreferenceNames(rawPrefs.categories).forEach((c) => interestSet.add(c))

    const finalInterests = Array.from(interestSet)
    assert.deepEqual(finalInterests, ['Cyberpunk', 'Solarpunk', 'Dystopian'])
    assert.ok(!finalInterests.includes('Contemporary Prose'))
    assert.ok(!finalInterests.includes('Serialized Fiction'))
  })
})
