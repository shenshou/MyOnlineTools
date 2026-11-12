import { normalizeNavigationData } from './validation'

function canonicalUrl(value) {
  const raw = String(value || '').trim()
  return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).href
}

export function mergeNavigationData(current, incoming, now = Date.now()) {
  const categories = [...current.categories]
  const categoryIds = new Set(categories.map(category => category.id))
  for (const category of incoming.categories) {
    if (!categoryIds.has(category.id)) {
      categories.push({ ...category })
      categoryIds.add(category.id)
    }
  }

  const websites = current.websites.map(website => ({ ...website, tags: [...(website.tags || [])] }))
  const byUrl = new Map(websites.map(website => [canonicalUrl(website.url).toLowerCase(), website]))
  let added = 0
  let updated = 0

  for (const imported of incoming.websites) {
    const url = canonicalUrl(imported.url)
    const existing = byUrl.get(url.toLowerCase())
    if (existing) {
      Object.assign(existing, imported, {
        id: existing.id,
        url,
        createdAt: existing.createdAt,
        updatedAt: now,
      })
      updated += 1
    } else {
      const inserted = { ...imported, url, tags: [...(imported.tags || [])] }
      websites.push(inserted)
      byUrl.set(url.toLowerCase(), inserted)
      added += 1
    }
  }

  const data = normalizeNavigationData({
    schemaVersion: 1,
    categories,
    websites,
    updatedAt: now,
  })
  return { data, added, updated }
}
