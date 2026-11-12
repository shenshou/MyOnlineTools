import { describe, expect, it } from 'vitest'
import { buildWebsiteRecord, createCategory, removeCategory, renameCategory } from './editor'

const categories = [
  { id: 'tools', name: '工具', icon: 'folder', sortOrder: 1 },
  { id: 'design', name: '设计', icon: 'palette', sortOrder: 2 },
]
const website = {
  id: 'site-1', name: 'Example', url: 'https://example.com/', favicon: '',
  description: '', notes: '', categoryId: 'design', tags: [], favorite: false,
  sortOrder: 1, createdAt: 10, updatedAt: 10,
}

describe('navigation editor operations', () => {
  it('creates a normalized website record with stable creation metadata', () => {
    const record = buildWebsiteRecord({
      name: ' 新网站 ', url: 'example.org:8443', tagsText: 'AI, 工具,AI', categoryId: 'tools',
    }, [website], null, 99, 'site-2')
    expect(record).toMatchObject({
      id: 'site-2', name: '新网站', url: 'https://example.org:8443/', categoryId: 'tools',
      tags: ['AI', '工具'], sortOrder: 2, createdAt: 99, updatedAt: 99,
    })
  })

  it('updates an existing website without changing its ID or creation time', () => {
    const record = buildWebsiteRecord({
      name: 'Updated', url: 'https://example.com', categoryId: 'tools', tagsText: '',
    }, [website], 'site-1', 99, 'unused')
    expect(record).toMatchObject({ id: 'site-1', name: 'Updated', createdAt: 10, updatedAt: 99, sortOrder: 1 })
  })

  it('rejects unsafe URLs, credentials, and duplicate websites', () => {
    expect(() => buildWebsiteRecord({
      name: 'Bad', url: 'javascript:alert(1)', categoryId: 'tools',
    }, [], null, 99, 'site-2')).toThrow('只支持 HTTP 或 HTTPS')
    expect(() => buildWebsiteRecord({
      name: 'Bad', url: 'https://user:pass@example.com', categoryId: 'tools',
    }, [], null, 99, 'site-2')).toThrow('不能包含用户名或密码')
    expect(() => buildWebsiteRecord({
      name: 'Duplicate', url: 'https://example.com/', categoryId: 'tools',
    }, [website], null, 99, 'site-2')).toThrow('该网址已存在')
  })

  it('creates and renames categories without duplicates', () => {
    expect(createCategory(categories, '学习', 'learning')).toHaveLength(3)
    expect(() => createCategory(categories, '工具', 'other')).toThrow('分类名称已存在')
    expect(() => createCategory(categories, '其他', 'tools')).toThrow('分类 ID 已存在')
    expect(() => renameCategory(categories, 'design', '工具')).toThrow('分类名称已存在')
    expect(renameCategory(categories, 'design', '视觉设计')[1].name).toBe('视觉设计')
    expect(() => renameCategory(categories, 'missing', '新名称')).toThrow('分类不存在')
  })

  it('moves websites to a remaining category when deleting a category', () => {
    const data = { schemaVersion: 1, categories, websites: [website], updatedAt: 10 }
    const result = removeCategory(data, 'design', 99)
    expect(result.categories).toHaveLength(1)
    expect(result.websites[0]).toMatchObject({ categoryId: 'tools', updatedAt: 99 })
    expect(data.categories).toHaveLength(2)
    expect(data.websites[0].categoryId).toBe('design')
  })

  it('does not allow deleting the last or an unknown category', () => {
    expect(() => removeCategory({
      schemaVersion: 1, categories: [categories[0]], websites: [], updatedAt: 1,
    }, 'tools')).toThrow('至少保留一个分类')
    expect(() => removeCategory({
      schemaVersion: 1, categories, websites: [], updatedAt: 1,
    }, 'missing')).toThrow('分类不存在')
  })
})
