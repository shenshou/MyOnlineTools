const MAX_CATEGORIES = 200
const MAX_WEBSITES = 10000
export const MAX_NAVIGATION_DOCUMENT_BYTES = 5 * 1024 * 1024

function requireString(value, label, maxLength, { optional = false } = {}) {
  if (optional && (value === undefined || value === null || value === '')) return ''
  if (typeof value !== 'string') throw new Error(`${label}必须是文本`)
  const result = value.trim()
  if (!optional && !result) throw new Error(`${label}不能为空`)
  if (result.length > maxLength) throw new Error(`${label}不能超过 ${maxLength} 个字符`)
  return result
}

function normalizeHttpUrl(value, label) {
  const raw = requireString(value, label, 2048)
  const explicitScheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  const hostAndPort = /^[a-z0-9.-]+:\d+(?:\/|$)/i.test(raw)
  if (explicitScheme && !['http', 'https'].includes(explicitScheme) && !hostAndPort) {
    throw new Error(`${label}只支持 HTTP 或 HTTPS`)
  }
  let parsed
  try { parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`) }
  catch { throw new Error(`${label}格式无效`) }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error(`${label}只支持 HTTP 或 HTTPS`)
  }
  if (parsed.username || parsed.password) throw new Error(`${label}不能包含用户名或密码`)
  return parsed.href
}

export function normalizeNavigationData(value) {
  let serialized
  try { serialized = JSON.stringify(value) }
  catch { throw new Error('网址数据无法序列化') }
  if (serialized && new TextEncoder().encode(serialized).byteLength > MAX_NAVIGATION_DOCUMENT_BYTES) {
    throw new Error('网址数据不能超过 5 MB')
  }
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) {
    throw new Error('网址数据版本或结构不正确')
  }
  if (!Array.isArray(value.categories) || !Array.isArray(value.websites)) {
    throw new Error('网址数据必须包含分类和网址数组')
  }
  if (value.categories.length < 1 || value.categories.length > MAX_CATEGORIES) {
    throw new Error(`分类数量必须在 1 到 ${MAX_CATEGORIES} 之间`)
  }
  if (value.websites.length > MAX_WEBSITES) {
    throw new Error(`网址数量不能超过 ${MAX_WEBSITES} 条`)
  }

  const categoryIds = new Set()
  const categoryNames = new Set()
  const categories = value.categories.map((category, index) => {
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      throw new Error(`第 ${index + 1} 个分类格式不正确`)
    }
    const id = requireString(category.id, `第 ${index + 1} 个分类 ID`, 100)
    const name = requireString(category.name, `分类「${id}」名称`, 80)
    if (categoryIds.has(id)) throw new Error(`分类 ID 重复：${id}`)
    if (categoryNames.has(name.toLocaleLowerCase())) throw new Error(`分类名称重复：${name}`)
    categoryIds.add(id)
    categoryNames.add(name.toLocaleLowerCase())
    const icon = requireString(category.icon, `分类「${name}」图标`, 50, { optional: true }) || 'folder'
    const sortOrder = Number(category.sortOrder ?? index + 1)
    if (!Number.isFinite(sortOrder)) throw new Error(`分类「${name}」排序值无效`)
    return { id, name, icon, sortOrder }
  })

  const websiteIds = new Set()
  const websiteUrls = new Set()
  const websites = value.websites.map((website, index) => {
    const label = `第 ${index + 1} 个网址`
    if (!website || typeof website !== 'object' || Array.isArray(website)) {
      throw new Error(`${label}记录格式不正确`)
    }
    const id = requireString(website.id, `${label} ID`, 100)
    const name = requireString(website.name, `${label}名称`, 100)
    const url = normalizeHttpUrl(website.url, `${label}网址`)
    if (websiteIds.has(id)) throw new Error(`网址 ID 重复：${id}`)
    if (websiteUrls.has(url.toLowerCase())) throw new Error(`网址重复：${url}`)
    websiteIds.add(id)
    websiteUrls.add(url.toLowerCase())

    const categoryId = requireString(website.categoryId, `${label}分类`, 100)
    if (!categoryIds.has(categoryId)) throw new Error(`${label}引用了不存在的分类：${categoryId}`)
    const faviconRaw = requireString(website.favicon, `${label}图标地址`, 2048, { optional: true })
    const favicon = faviconRaw ? normalizeHttpUrl(faviconRaw, `${label}图标地址`) : ''
    const description = requireString(website.description, `${label}简介`, 300, { optional: true })
    const notes = requireString(website.notes, `${label}备注`, 5000, { optional: true })
    if (website.tags !== undefined && !Array.isArray(website.tags)) throw new Error(`${label}标签必须是数组`)
    const tags = [...new Set((website.tags || []).map(tag => requireString(tag, `${label}标签`, 50)))]
    if (tags.length > 50) throw new Error(`${label}标签不能超过 50 个`)
    if (website.favorite !== undefined && typeof website.favorite !== 'boolean') throw new Error(`${label}收藏状态无效`)
    const sortOrder = Number(website.sortOrder ?? index + 1)
    const createdAt = Number(website.createdAt ?? 0)
    const updatedAt = Number(website.updatedAt ?? createdAt)
    if (![sortOrder, createdAt, updatedAt].every(Number.isFinite)) throw new Error(`${label}时间或排序字段无效`)

    return {
      id, name, url, favicon, description, notes, categoryId, tags,
      favorite: website.favorite === true, sortOrder, createdAt, updatedAt,
    }
  })

  const updatedAt = Number(value.updatedAt ?? Date.now())
  if (!Number.isFinite(updatedAt)) throw new Error('网址数据更新时间无效')
  return { schemaVersion: 1, categories, websites, updatedAt }
}

export function isValidNavigationData(value) {
  try {
    normalizeNavigationData(value)
    return true
  } catch {
    return false
  }
}
