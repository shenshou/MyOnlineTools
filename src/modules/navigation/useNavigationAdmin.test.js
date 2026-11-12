import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAccessToken, restoreAdminSession, setAccessToken, verifyAdminToken } from './github'
import { useNavigationAdmin } from './useNavigationAdmin'

vi.mock('./github', () => ({
  clearAccessToken: vi.fn(),
  restoreAdminSession: vi.fn(),
  setAccessToken: vi.fn(),
  verifyAdminToken: vi.fn(),
}))

describe('useNavigationAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('verifies and stores a repository-scoped token only after authorization succeeds', async () => {
    vi.mocked(verifyAdminToken).mockResolvedValue('shenshou/MyOnlineTools')
    const session = useNavigationAdmin()
    session.tokenInput.value = '  github_pat_test  '

    await expect(session.login()).resolves.toBe('shenshou/MyOnlineTools')

    expect(verifyAdminToken).toHaveBeenCalledWith('github_pat_test')
    expect(setAccessToken).toHaveBeenCalledWith('github_pat_test')
    expect(session.admin.value).toBe(true)
    expect(session.tokenInput.value).toBe('')
    expect(session.busy.value).toBe(false)
  })

  it('does not store a token when repository permission verification fails', async () => {
    vi.mocked(verifyAdminToken).mockRejectedValue(new Error('no write permission'))
    const session = useNavigationAdmin()
    session.tokenInput.value = 'github_pat_without_write'

    await expect(session.login()).rejects.toThrow('no write permission')

    expect(setAccessToken).not.toHaveBeenCalled()
    expect(session.admin.value).toBe(false)
    expect(session.tokenInput.value).toBe('github_pat_without_write')
    expect(session.busy.value).toBe(false)
  })

  it('rejects an empty token without making an API request', async () => {
    const session = useNavigationAdmin()
    await expect(session.login()).rejects.toThrow('请填写 Fine-grained Personal Access Token')
    expect(verifyAdminToken).not.toHaveBeenCalled()
    expect(session.busy.value).toBe(false)
  })

  it('restores a valid tab session and updates administrator state', async () => {
    vi.mocked(restoreAdminSession).mockResolvedValue('shenshou/MyOnlineTools')
    const session = useNavigationAdmin()

    await expect(session.restore()).resolves.toBe('shenshou/MyOnlineTools')
    expect(session.admin.value).toBe(true)
  })

  it('clears the session and local token input on logout', () => {
    const session = useNavigationAdmin()
    session.admin.value = true
    session.tokenInput.value = 'temporary'

    session.logout()

    expect(clearAccessToken).toHaveBeenCalledOnce()
    expect(session.admin.value).toBe(false)
    expect(session.tokenInput.value).toBe('')
  })
})
