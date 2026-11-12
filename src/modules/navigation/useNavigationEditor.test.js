import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useNavigationEditor } from './useNavigationEditor'

const category = { id: 'tools', name: '工具', icon: 'folder', sortOrder: 1 }
const secondCategory = { id: 'design', name: '设计', icon: 'palette', sortOrder: 2 }
const website = {
  id: 'site-1', name: 'Example', url: 'https://example.com/', favicon: '',
  description: '', notes: '', categoryId: 'tools', tags: [], favorite: false,
  sortOrder: 1, createdAt: 10, updatedAt: 10,
}
const createState = ({ authorized = true, categories = [category, secondCategory], websites = [website] } = {}) => {
  const data = ref({ schemaVersion: 1, categories: structuredClone(categories), websites: structuredClone(websites), updatedAt: 10 })
  const admin = ref(authorized)
  const showAdmin = ref(false)
  const selectedCategory = ref('all')
  const selectedWebsite = ref(null)
  const confirm = vi.fn().mockResolvedValue(true)
  const onMessage = vi.fn()
  const onError = vi.fn()
  const editor = useNavigationEditor({
    data, admin, showAdmin, selectedCategory, selectedWebsite, confirm, onMessage, onError,
  })
  return { data, admin, showAdmin, selectedCategory, selectedWebsite, confirm, onMessage, onError, editor }
}

describe('useNavigationEditor', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('requires administrator authorization before opening the editor', () => {
    const state = createState({ authorized: false })
    state.editor.openAdd()
    expect(state.showAdmin.value).toBe(true)
    expect(state.editor.showForm.value).toBe(false)
  })

  it('opens a new website form with the selected category', () => {
    const state = createState()
    state.selectedCategory.value = 'design'
    state.editor.openAdd()
    expect(state.editor.form.value.categoryId).toBe('design')
    expect(state.editor.editingId.value).toBeNull()
    expect(state.editor.showForm.value).toBe(true)
  })

  it('creates a website and stages it without writing to GitHub', () => {
    const state = createState()
    vi.spyOn(Date, 'now').mockReturnValue(99)
    vi.stubGlobal('crypto', { randomUUID: () => 'site-2' })
    state.editor.openAdd()
    state.editor.form.value = {
      name: 'New site', url: 'new.example', categoryId: 'tools', tagsText: 'AI, tools',
    }
    state.editor.saveForm()
    expect(state.data.value.websites).toHaveLength(2)
    expect(state.data.value.websites[1]).toMatchObject({
      id: 'site-2', name: 'New site', url: 'https://new.example/',
      tags: ['AI', 'tools'], createdAt: 99,
    })
    expect(state.editor.showForm.value).toBe(false)
    expect(state.onMessage).toHaveBeenCalledWith(expect.stringContaining('暂存'))
  })

  it('keeps the form open and reports duplicate URLs', () => {
    const state = createState()
    state.editor.openAdd()
    state.editor.form.value = { name: 'Duplicate', url: 'https://example.com' }
    state.editor.saveForm()
    expect(state.data.value.websites).toHaveLength(1)
    expect(state.editor.showForm.value).toBe(true)
    expect(state.onError).toHaveBeenCalledWith(expect.stringContaining('该网址已存在'))
  })

  it('updates an existing website while retaining its identity', () => {
    const state = createState()
    state.editor.openEdit(state.data.value.websites[0])
    state.editor.form.value.name = 'Renamed'
    state.editor.saveForm()
    expect(state.data.value.websites[0]).toMatchObject({
      id: 'site-1', name: 'Renamed', createdAt: 10,
    })
    expect(state.selectedWebsite.value).toBeNull()
  })

  it('deletes a website only after confirmation', async () => {
    const state = createState()
    state.selectedWebsite.value = state.data.value.websites[0]
    state.confirm.mockResolvedValueOnce(false)
    await state.editor.deleteWebsite(website)
    expect(state.data.value.websites).toHaveLength(1)
    state.confirm.mockResolvedValueOnce(true)
    await state.editor.deleteWebsite(website)
    expect(state.data.value.websites).toHaveLength(0)
    expect(state.selectedWebsite.value).toBeNull()
  })

  it('removes a category and moves its websites to a remaining category', async () => {
    const state = createState()
    state.selectedCategory.value = 'tools'
    await state.editor.removeCategory(category)
    expect(state.data.value.categories).toHaveLength(1)
    expect(state.data.value.websites[0].categoryId).toBe('design')
    expect(state.selectedCategory.value).toBe('all')
  })

  it('does not delete the last remaining category', async () => {
    const state = createState({ categories: [category] })
    await state.editor.removeCategory(category)
    expect(state.confirm).not.toHaveBeenCalled()
    expect(state.onError).toHaveBeenCalledWith('至少保留一个分类')
  })
})
