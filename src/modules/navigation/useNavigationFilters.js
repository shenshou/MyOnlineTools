import { computed } from 'vue'

export function useNavigationFilters({ data, search, selectedCategory, selectedTag, favoritesOnly, sortMode }) {
  const categoryCounts = computed(() => {
    const counts = Object.fromEntries(data.value.categories.map(category => [category.id, 0]))
    for (const website of data.value.websites) {
      if (Object.hasOwn(counts, website.categoryId)) counts[website.categoryId] += 1
    }
    return counts
  })

  const allTags = computed(() => [
    ...new Set(data.value.websites.flatMap(website => website.tags || [])),
  ].sort((a, b) => a.localeCompare(b, 'zh-CN')))

  const filtered = computed(() => {
    const query = search.value.trim().toLocaleLowerCase()
    const categoryNames = new Map(data.value.categories.map(category => [category.id, category.name]))
    const items = data.value.websites.filter(website => {
      const category = categoryNames.get(website.categoryId) || ''
      const haystack = [
        website.name, website.url, domainOf(website.url), website.description, website.notes,
        category, ...(website.tags || []),
      ].join(' ').toLocaleLowerCase()

      return (!query || haystack.includes(query))
        && (selectedCategory.value === 'all' || website.categoryId === selectedCategory.value)
        && (!selectedTag.value || (website.tags || []).includes(selectedTag.value))
        && (!favoritesOnly.value || website.favorite)
    })

    if (sortMode.value === 'name-asc') items.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    else if (sortMode.value === 'name-desc') items.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
    else if (sortMode.value === 'newest') items.sort((a, b) => b.createdAt - a.createdAt)
    else if (sortMode.value === 'updated') items.sort((a, b) => b.updatedAt - a.updatedAt)
    else items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    return items
  })

  return { categoryCounts, allTags, filtered }
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return '' }
}
