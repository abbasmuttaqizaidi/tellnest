/**
 * Inspectlet helper utilities
 */

/**
 * Checks if the current browser environment is running on localhost.
 * Strictly guarantees zero recordings on development environments.
 */
export function isLocalhostEnvironment(): boolean {
  if (typeof window === 'undefined') return true
  const hostname = window.location.hostname
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local')
  )
}

/**
 * Checks if a Clerk user object matches any excluded identifier
 * (by Clerk ID, primary email, or username).
 */
export function isUserExcluded(
  user: {
    id: string
    username?: string | null
    primaryEmailAddress?: { emailAddress: string } | null
    emailAddresses?: Array<{ emailAddress: string }>
  },
  excludedIdentifiers: string[]
): boolean {
  if (!excludedIdentifiers || excludedIdentifiers.length === 0) return false

  const exclusions = new Set(excludedIdentifiers.map((id) => id.toLowerCase().trim()))

  // Check Clerk user ID
  if (exclusions.has(user.id.toLowerCase().trim())) return true

  // Check username
  if (user.username && exclusions.has(user.username.toLowerCase().trim())) return true

  // Check primary email
  if (
    user.primaryEmailAddress?.emailAddress &&
    exclusions.has(user.primaryEmailAddress.emailAddress.toLowerCase().trim())
  ) {
    return true
  }

  // Check any associated email
  if (user.emailAddresses) {
    for (const e of user.emailAddresses) {
      if (e.emailAddress && exclusions.has(e.emailAddress.toLowerCase().trim())) {
        return true
      }
    }
  }

  return false
}
