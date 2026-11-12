function normalizeEditorUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) throw new Error('请填写网站网址')
  const explicitScheme = raw.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  if (explicitScheme && !['http', 'https'].includes(explicitScheme)) throw new Error('只支持 HTTP 或 HTTPS 网址')
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let parsed
  try { parsed = new URL(candidate) } catch { throw new Error('网址格式无效') }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('只支持 HTTP 或 HTTPS 网址')
  if (!parsed.hostname) throw new Error('网址格式无效')
  if (parsed.username || parsed.password) throw new Error('网址不能包含用户名或密码')
  return parsed.href
}

export function buildWebsiteRecord(form, websites, editingId, now, newId) {
  const name = String(form.name || '').trim()
  if (!name) throw new Error('请填写网站名称')
  const url = normalizeEditorUrl(form.url)
  const duplicate = websites.find(website => website.url.toLowerCase() === url.toLowerCase() && website.id !== editingId)
  if (duplicate) {
    const error = new Error(`该网址已存在：${duplicate.name}。请编辑已有记录或使用其他网址。`)
    error.code = 'DUPLICATE_URL'
    error.duplicate = duplicate
    throw error
  }
  const tags = [...new Set(String(form.tagsText || '').split(/[,，]/).map(tag => tag.trim()).filter(Boolean))]
  const fields = {
    name, url, favicon: String(form.favicon || '').trim(),
    description: String(form.description || '').trim(),
    notes: String(form.notes || '').trim(),
    categoryId: String(form.categoryId || ''), tags,
    favorite: Boolean(form.favorite), updatedAt: now,
  }
  if (editingId) {
    const existing = websites.find(website => website.id === editingId)
    if (!existing) throw new Error('要编辑的网址已不存在，请刷新后重试')
    return { ...existing, ...fields }
  }
  return {
    id: newId, ...fields,
    sortOrder: Math.max(0, ...websites.map(website => website.sortOrder || 0)) + 1,
    createdAt: now,
  }
}

export function createCategory(categories, rawName, id) {
  const name = String(rawName || '').trim()
  if (!name) throw new Error('请输入分类名称')
  if (categories.some(category => category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) throw new Error('分类名称已存在')
  if (categories.some(category => category.id === id)) throw new Error('分类 ID 已存在')
  return [...categories, { id, name, icon: 'folder', sortOrder: categories.length + 1 }]
}

export function renameCategory(categories, categoryId, rawName) {
  const name = String(rawName || '').trim()
  if (!name) throw new Error('请输入分类名称')
  if (categories.some(category => category.id !== categoryId && category.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('分类名称已存在')
  }
  if (!categories.some(category => category.id === categoryId)) throw new Error('分类不存在')
  return categories.map(category => category.id === categoryId ? { ...category, name } : category)
}

export function removeCategory(data, categoryId, now = Date.now()) {
  if (!data.categories.some(category => category.id === categoryId)) throw new Error('分类不存在')
  if (data.categories.length <= 1) throw new Error('至少保留一个分类')
  const target = data.categories.find(category => category.id !== categoryId)
  return {
    ...data,
    categories: data.categories.filter(category => category.id !== categoryId),
    websites: data.websites.map(website => website.categoryId === categoryId
      ? { ...website, categoryId: target.id, updatedAt: now }
      : website),
    updatedAt: now,
  }
}
