import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { saveNavigationData } from './github'
import { useNavigationPersistence } from './useNavigationPersistence'

vi.mock('./github', () => ({
  saveNavigationData: vi.fn(),
}))

function setup({ authorized = true, baselineValue = '{"schemaVersion":1}' } = {}) {
  const data = ref({ schemaVersion: 1, categories: [], websites: [], updatedAt: 1 })
  const baseline = ref(baselineValue)
  const admin = ref(authorized)
  const busy = ref(false)
  const saveConflict = ref(false)
  const onMessage = vi.fn()
  const onError = vi.fn()
  const onUnauthorized = vi.fn()
  const snapshot = () => JSON.stringify(data.value)
  const persistence = useNavigationPersistence({
    data, baseline, admin, busy, saveConflict, snapshot,
    onMessage, onError, onUnauthorized,
  })
  return { data, baseline, admin, busy, saveConflict, onMessage, onError, onUnauthorized, persistence }
}

describe('useNavigationPersistence', () => {
  beforeEach(() => {
    vi.mocked(saveNavigationData).mockReset()
  })

  it('saves the current document and updates its baseline after success', async () => {
    vi.mocked(saveNavigationData).mockResolvedValue('123456789abcdef')
    const state = setup()
    const dispatch = vi.spyOn(window, 'dispatchEvent')

    await expect(state.persistence.save()).resolves.toBe('123456789abcdef')

    expect(saveNavigationData).toHaveBeenCalledWith(
      expect.objectContaining({ schemaVersion: 1 }),
      '{"schemaVersion":1}',
    )
    expect(state.data.value.updatedAt).toBeGreaterThan(1)
    expect(state.baseline.value).toBe(JSON.stringify(state.data.value))
    expect(state.onMessage).toHaveBeenLastCalledWith('已保存到 GitHub。Commit：1234567')
    expect(state.busy.value).toBe(false)
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      type: 'mot-navigation-data-updated',
    }))
    dispatch.mockRestore()
  })

  it('preserves staged edits and exposes export recovery on a stale baseline', async () => {
    const error = Object.assign(new Error('stale'), { code: 'STALE_BASELINE' })
    vi.mocked(saveNavigationData).mockRejectedValue(error)
    const state = setup()
    const before = JSON.parse(JSON.stringify(state.data.value))

    await expect(state.persistence.save()).resolves.toBeNull()

    expect(state.data.value).toEqual(before)
    expect(state.saveConflict.value).toBe(true)
    expect(state.onError).toHaveBeenCalledWith(expect.stringContaining('导出待保存数据'))
    expect(state.busy.value).toBe(false)
  })

  it('treats write-time SHA conflicts as recoverable conflicts', async () => {
    const error = Object.assign(new Error('sha mismatch'), { code: 'WRITE_CONFLICT' })
    vi.mocked(saveNavigationData).mockRejectedValue(error)
    const state = setup()

    await state.persistence.save()

    expect(state.saveConflict.value).toBe(true)
    expect(state.onError).toHaveBeenCalledTimes(1)
  })

  it('does not attempt a write without a trusted baseline', async () => {
    const state = setup({ baselineValue: '' })

    await state.persistence.save()

    expect(saveNavigationData).not.toHaveBeenCalled()
    expect(state.onError).toHaveBeenCalledWith(expect.stringContaining('可信的数据基线'))
    expect(state.saveConflict.value).toBe(false)
  })

  it('requests administrator authorization instead of writing as a guest', async () => {
    const state = setup({ authorized: false })

    await state.persistence.save()

    expect(state.onUnauthorized).toHaveBeenCalledOnce()
    expect(saveNavigationData).not.toHaveBeenCalled()
    expect(state.busy.value).toBe(false)
  })

  it('reports ordinary API failures without marking a conflict', async () => {
    vi.mocked(saveNavigationData).mockRejectedValue(new Error('API unavailable'))
    const state = setup()

    await state.persistence.save()

    expect(state.onError).toHaveBeenCalledWith('API unavailable')
    expect(state.saveConflict.value).toBe(false)
  })
})
