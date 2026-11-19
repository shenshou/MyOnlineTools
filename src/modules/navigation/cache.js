const NAVIGATION_CACHE_KEY = 'mot-navigation-data-cache'

export function readNavigationCache() {
  try {
    if (typeof window === 'undefined') return null
    const serialized = window.localStorage.getItem(NAVIGATION_CACHE_KEY)
    return serialized ? JSON.parse(serialized) : null
  } catch {
    return null
  }
}

export function writeNavigationCache(data) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(NAVIGATION_CACHE_KEY, JSON.stringify(data))
  } catch {
    // Storage can be unavailable or full; in-memory data remains usable.
  }
  window.dispatchEvent(new CustomEvent('mot-navigation-data-updated', { detail: data }))
}
