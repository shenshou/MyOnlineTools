import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultNavigationData } from './defaultData'
import { fetchNavigationData } from './github'
import { useNavigationData } from './useNavigationData'

vi.mock('./github', () => ({
  fetchNavigationData: vi.fn(),
}))

describe('useNavigationData', () => {
  beforeEach(() => {
    localStorage.clear()
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
    expect(JSON.parse(localStorage.getItem('mot-navigation-data-cache'))).toEqual(remote)
  })

  it('uses valid local cache without automatically requesting remote data', async () => {
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
    localStorage.setItem('mot-navigation-data-cache', JSON.stringify(cached))

    const state = useNavigationData()
    expect(state.data.value.websites[0].id).toBe('cached-site')
    await state.loadData()

    expect(fetchNavigationData).not.toHaveBeenCalled()
    expect(state.data.value.websites[0].id).toBe('cached-site')
    expect(state.loading.value).toBe(false)
    expect(state.loadError.value).toBe('')
    expect(state.dirty.value).toBe(false)
  })

  it('keeps defaults and reports an error when no valid cache exists', async () => {
    vi.mocked(fetchNavigationData).mockRejectedValue(new Error('offline'))
    const state = useNavigationData()
    await state.loadData()

    expect(state.data.value).toEqual(defaultNavigationData)
    expect(state.loadError.value).toContain('offline')
    expect(state.loading.value).toBe(false)
  })

  it('retains cached data when a manual refresh fails', async () => {
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
    localStorage.setItem('mot-navigation-data-cache', JSON.stringify(cached))
    vi.mocked(fetchNavigationData).mockRejectedValue(new Error('network unavailable'))

    const state = useNavigationData()
    await state.refreshData()

    expect(fetchNavigationData).toHaveBeenCalledOnce()
    expect(state.data.value.websites[0].id).toBe('cached-site')
    expect(JSON.parse(localStorage.getItem('mot-navigation-data-cache'))).toEqual(cached)
    expect(state.loadError.value).toContain('network unavailable')
    expect(state.dirty.value).toBe(false)
  })
})
