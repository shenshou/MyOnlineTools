import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultNavigationData } from './defaultData'
import { fetchNavigationData } from './github'
import { useNavigationData } from './useNavigationData'

vi.mock('./github', () => ({
  fetchNavigationData: vi.fn(),
}))

describe('useNavigationData', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.mocked(fetchNavigationData).mockReset()
  })

  it('loads, normalizes, snapshots, and caches remote data', async () => {
    const remote = structuredClone(defaultNavigationData)
    remote.websites = [{
      id: 'site-1',
      name: 'Example',
      url: 'example.com',
      favicon: '',
      description: '',
      notes: '',
      categoryId: 'ai',
      tags: [],
      favorite: false,
      sortOrder: 1,
      createdAt: 1,
      updatedAt: 1,
    }]
    vi.mocked(fetchNavigationData).mockResolvedValue(remote)

    const state = useNavigationData()
    await state.loadData()

    expect(state.loading.value).toBe(false)
    expect(state.data.value.websites[0].url).toBe('https://example.com/')
    expect(state.baseline.value).toBe(state.snapshot())
    expect(state.dirty.value).toBe(false)
    expect(JSON.parse(sessionStorage.getItem('mot-navigation-data-cache'))).toEqual(remote)
  })

  it('falls back to the last valid session cache when remote loading fails', async () => {
    const cached = structuredClone(defaultNavigationData)
    cached.websites = [{
      id: 'cached-site',
      name: 'Cached',
      url: 'https://cached.example/',
      favicon: '',
      description: '',
      notes: '',
      categoryId: 'ai',
      tags: [],
      favorite: false,
      sortOrder: 1,
      createdAt: 1,
      updatedAt: 1,
    }]
    sessionStorage.setItem('mot-navigation-data-cache', JSON.stringify(cached))
    vi.mocked(fetchNavigationData).mockRejectedValue(new Error('network unavailable'))

    const state = useNavigationData()
    await state.loadData()

    expect(state.data.value.websites[0].id).toBe('cached-site')
    expect(state.baseline.value).toBe(state.snapshot())
    expect(state.loadError.value).toContain('上次成功读取的数据')
    expect(state.loadError.value).toContain('network unavailable')
    expect(state.dirty.value).toBe(false)
  })

  it('keeps defaults and reports an error when no valid cache exists', async () => {
    vi.mocked(fetchNavigationData).mockRejectedValue(new Error('offline'))
    const state = useNavigationData()
    await state.loadData()

    expect(state.data.value).toEqual(defaultNavigationData)
    expect(state.baseline.value).toBe('')
    expect(state.loadError.value).toContain('offline')
    expect(state.loading.value).toBe(false)
  })
})
