import { describe, expect, it } from 'vitest'
import { mergeNavigationData } from './operations'

const website = (overrides = {}) => ({
  id: 'site-1',
  name: 'Example',
  url: 'https://example.com',
  favicon: '',
  description: 'Original description',
  notes: '',
  categoryId: 'tools',
  tags: ['original'],
  favorite: false,
  sortOrder: 1,
  createdAt: 10,
  updatedAt: 10,
  ...overrides,
})
const document = (websites = [], categories = [{ id: 'tools', name: '工具', icon: 'folder', sortOrder: 1 }]) => ({
  schemaVersion: 1,
  categories,
  websites,
  updatedAt: 10,
})

describe('mergeNavigationData', () => {
  it('adds new websites and updates matching URLs without replacing their IDs', () => {
    const current = document([website()])
    const incoming = document([
      website({ id: 'imported-id', name: 'Updated', url: 'https://example.com/', description: 'Updated description', createdAt: 1 }),
      website({ id: 'site-2', name: 'Another', url: 'https://another.example' }),
    ])
    const result = mergeNavigationData(current, incoming, 99)
    expect(result.added).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.data.websites).toHaveLength(2)
    expect(result.data.websites[0]).toMatchObject({
      id: 'site-1',
      name: 'Updated',
      createdAt: 10,
      updatedAt: 99,
    })
  })

  it('does not mutate either input document', () => {
    const current = document([website()])
    const incoming = document([website({ id: 'imported-id', name: 'Imported' })])
    const currentBefore = structuredClone(current)
    const incomingBefore = structuredClone(incoming)
    mergeNavigationData(current, incoming, 99)
    expect(current).toEqual(currentBefore)
    expect(incoming).toEqual(incomingBefore)
  })

  it('rejects a merged document with colliding category names or website IDs', () => {
    const current = document([website()])
    const incoming = document(
      [website({ id: 'site-2', url: 'https://another.example' })],
      [{ id: 'other', name: '工具', icon: 'folder', sortOrder: 2 }],
    )
    expect(() => mergeNavigationData(current, incoming, 99)).toThrow('分类名称重复')
  })
})
