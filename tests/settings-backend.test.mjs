import test from 'node:test'
import assert from 'node:assert/strict'
import {
  executeGetSettingsData,
  executeUpdateAccountProfile,
  executeUpdateReadingPreferences,
  executeUpdateRecommendations,
  executeResetRecommendationTaste,
  executeUpdateReadingExperience,
  executeUpdateNotificationPreferences,
  executeUpdatePrivacySettings,
  executeUnblockUser,
  executeClearReadingHistory,
  executeDeleteUserAccount,
  executeCheckUsernameAvailability,
} from '../src/server/settings.ts'

// ==============================================================================
// TEST SUITE: Settings Backend Invariants & Security
// ==============================================================================

test('Settings Backend: executeGetSettingsData rejects unauthenticated requests fail-closed', async () => {
  await assert.rejects(
    async () => {
      await executeGetSettingsData({
        getAuthState: async () => ({ userId: null }),
      })
    },
    {
      message: /UNAUTHORIZED/,
    }
  )
})

test('Settings Backend: executeGetSettingsData returns full payload for authenticated user', async () => {
  const mockAuthState = { userId: 'clerk_test_user_1' }

  // Generic chainable query mock builder
  const createChainable = (resolvedValue) => {
    const chain = () => chain
    chain.select = () => chain
    chain.eq = () => chain
    chain.neq = () => chain
    chain.order = () => chain
    chain.single = async () => resolvedValue
    chain.maybeSingle = async () => resolvedValue
    chain.then = (onfulfilled) => Promise.resolve(resolvedValue).then(onfulfilled)
    return chain
  }

  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        return createChainable({
          data: {
            id: 'prof_123',
            clerk_user_id: 'clerk_test_user_1',
            username: 'eleanor_vance',
            display_name: 'Eleanor Vance',
            bio: 'Writer of quiet dread and ghost stories.',
            avatar_path: null,
            website_url: 'https://eleanor.example',
            location: 'Hill House',
            pronouns: 'she/her',
            gender: null,
            is_public: true,
            account_status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            preferences: {
              recommendations: {
                personalized: true,
                discoveryPreference: 'emerging',
              },
              reader: {
                inlineMarginalia: true,
                continuousScroll: false,
                floatingToc: true,
              },
            },
          },
          error: null,
        })
      }
      if (table === 'user_preferences') {
        return createChainable({
          data: {
            adult_content_enabled: true,
            preferred_language: 'fr',
            theme: 'sepia',
            reading_mode: 'focus',
            font_size: 'lg',
            line_height: 'relaxed',
            email_notifications_enabled: true,
            push_notifications_enabled: true,
            comment_notifications_enabled: true,
            follow_notifications_enabled: true,
            new_chapter_notifications_enabled: true,
          },
          error: null,
        })
      }
      if (table === 'user_blocks') {
        return createChainable({
          data: [
            {
              id: 'block_1',
              created_at: '2026-01-10T00:00:00Z',
              blocked_profile: {
                id: 'blocked_prof_1',
                username: 'troll_user',
                display_name: 'Troll User',
                avatar_path: null,
              },
            },
          ],
          error: null,
        })
      }
      if (table === 'reading_history') {
        const countChain = createChainable({ count: 42, error: null })
        countChain.eq = async () => ({ count: 42, error: null })
        return countChain
      }
      if (table === 'categories' || table === 'genres') {
        return createChainable({
          data: [
            { slug: 'fiction', name: 'Fiction' },
            { slug: 'poetry', name: 'Poetry' },
          ],
          error: null,
        })
      }
      return createChainable({ data: null, error: null })
    },
  }

  const result = await executeGetSettingsData({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
  })

  assert.equal(result.profile.username, 'eleanor_vance')
  assert.equal(result.profile.displayName, 'Eleanor Vance')
  assert.equal(result.readingPreferences.adultContentEnabled, true)
  assert.equal(result.readingPreferences.preferredLanguage, 'fr')
  assert.equal(result.recommendations.discoveryPreference, 'emerging')
  assert.equal(result.readingExperience.theme, 'sepia')
  assert.equal(result.readingExperience.fontSize, 'lg')
  assert.equal(result.privacy.readingHistoryCount, 42)
  assert.equal(result.privacy.blockedUsers.length, 1)
  assert.equal(result.privacy.blockedUsers[0].username, 'troll_user')
})

test('Settings Backend: executeUpdateAccountProfile rejects taken username with descriptive error', async () => {
  const mockAuthState = { userId: 'clerk_test_user_1' }

  let queryCall = 0
  const mockAdminClient = {
    from: (table) => {
      assert.equal(table, 'profiles')
      return {
        select: () => {
          queryCall++
          const chain = {}
          chain.eq = () => chain
          chain.neq = () => chain
          chain.single = async () => ({
            data: { id: 'prof_123', clerk_user_id: 'clerk_test_user_1', preferences: {} },
            error: null,
          })
          chain.maybeSingle = async () => {
            if (queryCall === 1) {
              // Caller's profile
              return { data: { id: 'prof_123', clerk_user_id: 'clerk_test_user_1' }, error: null }
            }
            // Someone else already has this username
            return { data: { id: 'prof_999', username: 'already_taken' }, error: null }
          }
          return chain
        },
      }
    },
  }

  await assert.rejects(
    async () => {
      await executeUpdateAccountProfile({
        getAuthState: async () => mockAuthState,
        adminClient: mockAdminClient,
        data: {
          username: 'already_taken',
          displayName: 'Eleanor',
        },
      })
    },
    {
      message: /already taken/,
    }
  )
})

test('Settings Backend: executeUpdateReadingPreferences updates DB tables', async () => {
  const mockAuthState = { userId: 'clerk_test_user_1' }
  let userPrefsUpdated = false
  let profilePrefsUpdated = false

  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'prof_123', preferences: {} },
                error: null,
              }),
            }),
          }),
          update: (payload) => {
            profilePrefsUpdated = true
            assert.deepEqual(payload.preferences.genres, ['fantasy', 'scifi'])
            return {
              eq: async () => ({ error: null }),
            }
          },
        }
      }
      if (table === 'user_preferences') {
        return {
          upsert: (payload) => {
            userPrefsUpdated = true
            assert.equal(payload.adult_content_enabled, true)
            assert.equal(payload.preferred_language, 'es')
            return {
              select: () => ({
                maybeSingle: async () => ({ error: null }),
              }),
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeUpdateReadingPreferences({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
    data: {
      favoriteGenres: ['fantasy', 'scifi'],
      preferredCategories: ['novels'],
      preferredLanguage: 'es',
      adultContentEnabled: true,
    },
  })

  assert.equal(res.success, true)
  assert.equal(userPrefsUpdated, true)
  assert.equal(profilePrefsUpdated, true)
})

test('Settings Backend: executeResetRecommendationTaste flushes recommendation signals safely', async () => {
  const mockAuthState = { userId: 'clerk_test_user_1' }
  let tasteFlushed = false

  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: 'prof_123',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'reading_history') {
        return {
          delete: () => {
            tasteFlushed = true
            return {
              eq: async (col, val) => {
                assert.equal(col, 'user_id')
                assert.equal(val, 'prof_123')
                return { error: null }
              },
            }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeResetRecommendationTaste({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
  })

  assert.equal(res.success, true)
  assert.equal(tasteFlushed, true)
})

test('Settings Backend: executeClearReadingHistory deletes only user reading records', async () => {
  const mockAuthState = { userId: 'clerk_test_user_1' }
  let historyDeleted = false

  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'prof_123' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'reading_history') {
        return {
          delete: () => ({
            eq: (col, val) => {
              historyDeleted = true
              assert.equal(col, 'user_id')
              assert.equal(val, 'prof_123')
              return { error: null }
            },
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeClearReadingHistory({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
  })

  assert.equal(res.success, true)
  assert.equal(historyDeleted, true)
})

test('Settings Backend: executeUnblockUser removes block record', async () => {
  const mockAuthState = { userId: 'clerk_test_user_1' }
  let unblocked = false

  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: 'prof_123' },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'user_blocks') {
        return {
          delete: () => ({
            eq: (col1, val1) => ({
              eq: (col2, val2) => {
                unblocked = true
                assert.equal(col1, 'blocker_id')
                assert.equal(val1, 'prof_123')
                assert.equal(col2, 'blocked_id')
                assert.equal(val2, 'prof_target_456')
                return { error: null }
              },
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
  }

  const res = await executeUnblockUser({
    getAuthState: async () => mockAuthState,
    targetProfileId: 'prof_target_456',
    adminClient: mockAdminClient,
  })

  assert.equal(res.success, true)
  assert.equal(unblocked, true)
})

test('Settings Backend: executeGetSettingsData normalizes onboarding details into settings payload', async () => {
  const mockAuthState = { userId: 'clerk_onboarding_user' }

  const createChainable = (resolvedValue) => {
    const chain = () => chain
    chain.select = () => chain
    chain.eq = () => chain
    chain.neq = () => chain
    chain.order = () => chain
    chain.single = async () => resolvedValue
    chain.maybeSingle = async () => resolvedValue
    chain.then = (onfulfilled) => Promise.resolve(resolvedValue).then(onfulfilled)
    return chain
  }

  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        return createChainable({
          data: {
            id: 'prof_onboarded',
            clerk_user_id: 'clerk_onboarding_user',
            username: 'novelist_jane',
            display_name: 'Jane Austen',
            bio: 'Writer of manners, romance, and irony.',
            avatar_path: '/unisex-avatar.svg',
            website_url: null,
            location: 'Bath, UK',
            pronouns: 'she/her',
            gender: 'female',
            onboarding_completed: true,
            is_public: true,
            account_status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            preferences: {
              genres: [
                { id: 'romance', name: 'Romance' },
                { id: 'literary-fiction', name: 'Literary Fiction' },
              ],
              categories: [
                { id: 'serialized-novels', name: 'Serialized Novels' },
              ],
              interestedInWriting: true,
              termsAccepted: true,
              completedAt: '2026-01-01T00:05:00Z',
            },
          },
          error: null,
        })
      }
      if (table === 'user_preferences') {
        return createChainable({
          data: {
            adult_content_enabled: false,
            preferred_language: 'en',
            theme: 'light',
          },
          error: null,
        })
      }
      if (table === 'reading_history') {
        const countChain = createChainable({ count: 12, error: null })
        countChain.eq = async () => ({ count: 12, error: null })
        return countChain
      }
      return createChainable({ data: [], error: null })
    },
  }

  const result = await executeGetSettingsData({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
  })

  // Verify gender and onboarding details
  assert.equal(result.profile.gender, 'female')
  assert.equal(result.profile.pronouns, 'she/her')
  assert.equal(result.profile.interestedInWriting, true)
  assert.equal(result.profile.onboardingCompleted, true)

  // Verify genres and categories from onboarding {id, name} objects normalized to slugs
  assert.deepEqual(result.readingPreferences.favoriteGenres, ['romance', 'literary-fiction'])
  assert.deepEqual(result.readingPreferences.preferredCategories, ['serialized-novels'])
})

test('Settings Backend: executeUpdateAccountProfile persists gender and interestedInWriting to database', async () => {
  const mockAuthState = { userId: 'clerk_onboarding_user' }
  let updatePayload = null

  let selectCount = 0
  const mockAdminClient = {
    from: (table) => {
      assert.equal(table, 'profiles')
      return {
        select: () => {
          selectCount++
          let hasNeq = false
          const chain = {}
          chain.eq = () => chain
          chain.neq = () => {
            hasNeq = true
            return chain
          }
          chain.maybeSingle = async () => {
            if (hasNeq) {
              // Username collision check returns null (not taken by anyone else)
              return { data: null, error: null }
            }
            // Current profile / preferences query
            return {
              data: {
                id: 'prof_onboarded',
                clerk_user_id: 'clerk_onboarding_user',
                username: 'old_jane',
                preferences: { genres: ['romance'] },
              },
              error: null,
            }
          }
          return chain
        },
        update: (payload) => {
          updatePayload = payload
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'prof_onboarded',
                    clerk_user_id: 'clerk_onboarding_user',
                    display_name: payload.display_name || 'Jane',
                    username: payload.username || 'novelist_jane',
                    gender: payload.gender,
                    preferences: payload.preferences,
                  },
                  error: null,
                }),
              }),
            }),
          }
        },
      }
    },
  }

  const updated = await executeUpdateAccountProfile({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
    data: {
      displayName: 'Jane Austen',
      username: 'novelist_jane',
      gender: 'female',
      interestedInWriting: true,
    },
  })

  assert.equal(updatePayload.gender, 'female')
  assert.equal(updatePayload.preferences.interestedInWriting, true)
  assert.equal(updated.gender, 'female')
  assert.equal(updated.success, true)
  assert.ok(updated.profile, 'Profile object must be present')
})

test('Settings Backend: executeGetSettingsData falls back gracefully to platform canonical taxonomy', async () => {
  const mockAuthState = { userId: 'clerk_taxonomy_test' }
  const mockAdminClient = {
    from: (table) => {
      if (table === 'profiles') {
        const chain = () => chain
        chain.select = () => chain
        chain.eq = () => chain
        chain.maybeSingle = async () => ({
          data: {
            id: 'prof_yam_audit',
            clerk_user_id: 'clerk_taxonomy_test',
            username: 'yamevilzaidi',
            display_name: 'Yam Zaidi',
            pronouns: 'She / Her',
            gender: 'Female',
            onboarding_completed: true,
            preferences: {
              genres: ['thriller', 'crime', 'contemporary-fiction', 'mystery', 'espionage-spy'],
              categories: ['memoir-autobiography', 'childrens-fiction', 'serialized-fiction'],
              preferred_language: 'en',
              adult_content_enabled: true,
            },
          },
          error: null,
        })
        return chain
      }
      if (table === 'categories' || table === 'genres') {
        const chain = () => chain
        chain.select = () => chain
        chain.eq = () => chain
        chain.order = async () => ({ data: [], error: null })
        return chain
      }
      const chain = () => chain
      chain.select = () => chain
      chain.eq = () => chain
      chain.maybeSingle = async () => ({ data: null, error: null })
      return chain
    },
  }

  const result = await executeGetSettingsData({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
  })

  // Verify pronouns and gender retrieved accurately
  assert.equal(result.profile.pronouns, 'She / Her')
  assert.equal(result.profile.gender, 'Female')
  assert.equal(result.profile.onboardingCompleted, true)

  // Verify full taxonomy fallback (all canonical categories and genres)
  assert.ok(result.taxonomy.genres.length >= 33, 'Must provide all canonical genres')
  assert.ok(result.taxonomy.categories.length >= 16, 'Must provide all canonical categories')

  // Verify user preferences contain all onboarding selections
  assert.deepEqual(result.readingPreferences.favoriteGenres, [
    'thriller',
    'crime',
    'contemporary-fiction',
    'mystery',
    'espionage-spy',
  ])
  assert.deepEqual(result.readingPreferences.preferredCategories, [
    'memoir-autobiography',
    'childrens-fiction',
    'serialized-fiction',
  ])
})

test('Settings Backend: executeUpdateReadingPreferences enforces maximum 5 genres ceiling', async () => {
  const mockAuthState = { userId: 'clerk_test_max_ceiling' }
  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: 'prof_123', preferences: {} },
            error: null,
          }),
        }),
      }),
    }),
  }

  await assert.rejects(
    async () => {
      await executeUpdateReadingPreferences({
        getAuthState: async () => mockAuthState,
        adminClient: mockAdminClient,
        data: {
          favoriteGenres: ['genre1', 'genre2', 'genre3', 'genre4', 'genre5', 'genre6'],
          preferredCategories: ['cat1'],
          preferredLanguage: 'en',
          adultContentEnabled: false,
        },
      })
    },
    {
      message: /maximum of 5 favorite genres/,
    }
  )
})

test('Settings Backend: executeUpdateReadingPreferences enforces maximum 3 categories ceiling', async () => {
  const mockAuthState = { userId: 'clerk_test_max_ceiling' }
  const mockAdminClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { id: 'prof_123', preferences: {} },
            error: null,
          }),
        }),
      }),
    }),
  }

  await assert.rejects(
    async () => {
      await executeUpdateReadingPreferences({
        getAuthState: async () => mockAuthState,
        adminClient: mockAdminClient,
        data: {
          favoriteGenres: ['genre1', 'genre2'],
          preferredCategories: ['cat1', 'cat2', 'cat3', 'cat4'],
          preferredLanguage: 'en',
          adultContentEnabled: false,
        },
      })
    },
    {
      message: /maximum of 3 preferred story formats/,
    }
  )
})

test('Settings Backend: executeCheckUsernameAvailability verifies availability against usernames table', async () => {
  const mockAdminClient = {
    from: (table) => {
      if (table === 'usernames') {
        return {
          select: () => ({
            eq: (col, val) => ({
              maybeSingle: async () => {
                if (val === 'taken_author') {
                  return { data: { username: 'taken_author' }, error: null }
                }
                return { data: null, error: null }
              },
            }),
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { username: 'my_current_username' },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    },
  }

  // 1. Too short
  const resShort = await executeCheckUsernameAvailability({
    adminClient: mockAdminClient,
    username: 'ab',
  })
  assert.equal(resShort.available, false)
  assert.match(resShort.message, /at least 3 characters/)

  // 2. Already taken in usernames table
  const resTaken = await executeCheckUsernameAvailability({
    adminClient: mockAdminClient,
    username: 'taken_author',
    currentClerkUserId: 'clerk_diff_user',
  })
  assert.equal(resTaken.available, false)
  assert.equal(resTaken.isTaken, true)
  assert.match(resTaken.message, /already taken/)

  // 3. User's own current username
  const resCurrent = await executeCheckUsernameAvailability({
    adminClient: mockAdminClient,
    username: 'my_current_username',
    currentClerkUserId: 'clerk_owner',
  })
  assert.equal(resCurrent.available, true)
  assert.equal(resCurrent.isCurrent, true)
  assert.match(resCurrent.message, /current handle/)

  // 4. Truly available username
  const resAvailable = await executeCheckUsernameAvailability({
    adminClient: mockAdminClient,
    username: 'totally_unique_author_99',
    currentClerkUserId: 'clerk_owner',
  })
  assert.equal(resAvailable.available, true)
  assert.equal(resAvailable.isTaken, false)
  assert.match(resAvailable.message, /is available/)
})

// ==============================================================================
// TEST SUITE: 32-Day Username Lock Invariants
// ==============================================================================

test('Settings Backend: executeGetSettingsData calculates 32-day username lock correctly', async () => {
  const mockAuthState = { userId: 'clerk_locked_user' }
  const createChainable = (resolvedValue) => {
    const chain = () => chain
    chain.select = () => chain
    chain.eq = () => chain
    chain.neq = () => chain
    chain.order = () => chain
    chain.single = async () => resolvedValue
    chain.maybeSingle = async () => resolvedValue
    chain.then = (onfulfilled) => Promise.resolve(resolvedValue).then(onfulfilled)
    return chain
  }

  // 10 days ago -> locked (22 days remaining)
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  const mockAdminLocked = {
    from: (table) => {
      if (table === 'profiles') {
        return createChainable({
          data: {
            id: 'prof_locked',
            clerk_user_id: 'clerk_locked_user',
            username: 'locked_writer',
            display_name: 'Locked Writer',
            bio: '',
            avatar_path: null,
            preferences: {
              username_verified: true,
              username_verified_at: tenDaysAgo,
            },
          },
          error: null,
        })
      }
      return createChainable({ data: {}, error: null })
    },
  }

  const resLocked = await executeGetSettingsData({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminLocked,
  })

  assert.equal(resLocked.profile.isUsernameLocked, true)
  assert.equal(resLocked.profile.usernameLockDaysRemaining, 22)
  assert.equal(resLocked.profile.usernameVerifiedAt, tenDaysAgo)

  // 35 days ago -> unlocked
  const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  const mockAdminUnlocked = {
    from: (table) => {
      if (table === 'profiles') {
        return createChainable({
          data: {
            id: 'prof_unlocked',
            clerk_user_id: 'clerk_locked_user',
            username: 'free_writer',
            display_name: 'Free Writer',
            bio: '',
            avatar_path: null,
            preferences: {
              username_verified: true,
              username_verified_at: thirtyFiveDaysAgo,
            },
          },
          error: null,
        })
      }
      return createChainable({ data: {}, error: null })
    },
  }

  const resUnlocked = await executeGetSettingsData({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminUnlocked,
  })

  assert.equal(resUnlocked.profile.isUsernameLocked, false)
  assert.equal(resUnlocked.profile.usernameLockDaysRemaining, 0)
})

test('Settings Backend: executeUpdateAccountProfile rejects username change when 32-day lock is active', async () => {
  const mockAuthState = { userId: 'clerk_test_lock' }
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()

  const mockAdminClient = {
    from: (table) => {
      assert.equal(table, 'profiles')
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'prof_lock_1',
                clerk_user_id: 'clerk_test_lock',
                username: 'current_handle',
                preferences: {
                  username_verified_at: fiveDaysAgo,
                },
              },
              error: null,
            }),
            maybeSingle: async () => ({
              data: {
                id: 'prof_lock_1',
                clerk_user_id: 'clerk_test_lock',
                username: 'current_handle',
                preferences: {
                  username_verified_at: fiveDaysAgo,
                },
              },
              error: null,
            }),
          }),
        }),
      }
    },
  }

  await assert.rejects(
    async () => {
      await executeUpdateAccountProfile({
        getAuthState: async () => mockAuthState,
        adminClient: mockAdminClient,
        data: {
          username: 'brand_new_handle',
        },
      })
    },
    {
      message: /Username is locked\. You cannot change your username for 32 days after verification \(27 days remaining\)\./,
    }
  )
})

test('Settings Backend: executeUpdateAccountProfile allows non-username changes even when username is locked', async () => {
  const mockAuthState = { userId: 'clerk_test_lock' }
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  let profileUpdated = false

  const mockAdminClient = {
    from: (table) => {
      assert.equal(table, 'profiles')
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: 'prof_lock_1',
                clerk_user_id: 'clerk_test_lock',
                username: 'current_handle',
                preferences: {
                  username_verified_at: fiveDaysAgo,
                },
              },
              error: null,
            }),
            maybeSingle: async () => ({
              data: {
                id: 'prof_lock_1',
                clerk_user_id: 'clerk_test_lock',
                username: 'current_handle',
                preferences: {
                  username_verified_at: fiveDaysAgo,
                },
              },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          profileUpdated = true
          assert.equal(payload.display_name, 'Updated Display Name')
          assert.equal(payload.bio, 'Updated author bio.')
          // Username should NOT be in payload
          assert.equal(payload.username, undefined)
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'prof_lock_1',
                    clerk_user_id: 'clerk_test_lock',
                    username: 'current_handle',
                    display_name: 'Updated Display Name',
                    bio: 'Updated author bio.',
                  },
                  error: null,
                }),
              }),
            }),
          }
        },
      }
    },
  }

  const result = await executeUpdateAccountProfile({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
    data: {
      displayName: 'Updated Display Name',
      bio: 'Updated author bio.',
      username: 'current_handle', // Same username, not changing it
    },
  })

  assert.equal(profileUpdated, true)
  assert.equal(result.display_name, 'Updated Display Name')
})

test('Settings Backend: executeUpdateAccountProfile allows username change after 32 days have passed', async () => {
  const mockAuthState = { userId: 'clerk_test_lock' }
  const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  let updatedPayload = null

  let queryCount = 0
  const mockAdminClient = {
    from: (table) => {
      assert.equal(table, 'profiles')
      return {
        select: () => {
          queryCount++
          const chain = {}
          chain.eq = () => chain
          chain.neq = () => chain
          chain.single = async () => ({
            data: {
              id: 'prof_lock_1',
              clerk_user_id: 'clerk_test_lock',
              username: 'old_handle',
              preferences: {
                username_verified_at: fortyDaysAgo,
              },
            },
            error: null,
          })
          chain.maybeSingle = async () => {
            if (queryCount === 1) {
              return {
                data: {
                  id: 'prof_lock_1',
                  clerk_user_id: 'clerk_test_lock',
                  username: 'old_handle',
                  preferences: {
                    username_verified_at: fortyDaysAgo,
                  },
                },
                error: null,
              }
            }
            // Collision query: no other user has new_handle
            return { data: null, error: null }
          }
          return chain
        },
        update: (payload) => {
          updatedPayload = payload
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: {
                    id: 'prof_lock_1',
                    clerk_user_id: 'clerk_test_lock',
                    username: payload.username,
                    preferences: payload.preferences,
                  },
                  error: null,
                }),
              }),
            }),
          }
        },
      }
    },
  }

  const result = await executeUpdateAccountProfile({
    getAuthState: async () => mockAuthState,
    adminClient: mockAdminClient,
    data: {
      username: 'fresh_new_handle',
    },
  })

  assert.equal(result.username, 'fresh_new_handle')
  assert.equal(updatedPayload.username, 'fresh_new_handle')
  assert.equal(updatedPayload.preferences.username_verified, true)
  assert.equal(updatedPayload.preferences.verified_username, 'fresh_new_handle')
  assert.ok(updatedPayload.preferences.username_verified_at)
})


