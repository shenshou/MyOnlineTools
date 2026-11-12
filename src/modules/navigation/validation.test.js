import { describe, expect, it } from 'vitest'
import { isValidNavigationData, normalizeNavigationData } from './validation'

const validData = () => ({
  schemaVersion: 1,
  categories: [{ id: 'tools', name: '工具', icon: 'folder', sortOrder: 1 }],
  websites: [{
    id: 'site-1',
    name: 'Example',
    url: 'https://example.com',
    favicon: '',
    description: '',
    notes: '',
    categoryId: 'tools',
    tags: ['test'],
    favorite: false,
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  }],
  updatedAt: 1,
})

describe('normalizeNavigationData', () => {
  it('normalizes a valid navigation document', () => {
    const result = normalizeNavigationData(validData())
    expect(result.schemaVersion).toBe(1)
    expect(result.websites[0].url).toBe('https://example.com/')
    expect(result.websites[0].tags).toEqual(['test'])
  })

  it('rejects non-HTTP protocols and embedded credentials', () => {
    const javascriptUrl = validData()
    javascriptUrl.websites[0].url = 'javascript:alert(1)'
    expect(() => normalizeNavigationData(javascriptUrl)).toThrow('只支持 HTTP 或 HTTPS')

    const credentialUrl = validData()
    credentialUrl.websites[0].url = 'https://user:pass@example.com'
    expect(() => normalizeNavigationData(credentialUrl)).toThrow('不能包含用户名或密码')
  })

  it('rejects duplicate category IDs and website IDs', () => {
    const duplicateCategory = validData()
    duplicateCategory.categories.push({ ...duplicateCategory.categories[0] })
    expect(() => normalizeNavigationData(duplicateCategory)).toThrow('分类 ID 重复')

    const duplicateWebsite = validData()
    duplicateWebsite.websites.push({ ...duplicateWebsite.websites[0], url: 'https://another.example' })
    expect(() => normalizeNavigationData(duplicateWebsite)).toThrow('网址 ID 重复')
  })

  it('rejects duplicate URLs and unknown category references', () => {
    const duplicateUrl = validData()
    duplicateUrl.websites.push({ ...duplicateUrl.websites[0], id: 'site-2' })
    expect(() => normalizeNavigationData(duplicateUrl)).toThrow('网址重复')

    const unknownCategory = validData()
    unknownCategory.websites[0].categoryId = 'missing'
    expect(() => normalizeNavigationData(unknownCategory)).toThrow('不存在的分类')
  })

  it('rejects malformed field types and oversized fields', () => {
    const malformed = validData()
    malformed.websites[0].tags = 'not-an-array'
    expect(() => normalizeNavigationData(malformed)).toThrow('标签必须是数组')

    const oversized = validData()
    oversized.websites[0].notes = 'x'.repeat(5001)
    expect(() => normalizeNavigationData(oversized)).toThrow('不能超过 5000')
  })

  it('rejects oversized navigation documents before processing records', () => {
    const oversized = validData()
    oversized.websites[0].notes = '中'.repeat(1_800_000)
    expect(() => normalizeNavigationData(oversized)).toThrow('不能超过 5 MB')
  })

  it('reports invalid data without throwing from the predicate', () => {
    expect(isValidNavigationData(validData())).toBe(true)
    expect(isValidNavigationData({ schemaVersion: 1, categories: [], websites: [] })).toBe(false)
  })
})
