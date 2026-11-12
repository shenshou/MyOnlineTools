import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAccessToken,
  saveNavigationData,
  setAccessToken,
  verifyAdminToken,
} from './github'

const baseline = {
  schemaVersion: 1,
  categories: [{ id: 'tools', name: '工具', icon: 'folder', sortOrder: 1 }],
  websites: [{
    id: 'site-1',
    name: '示例网站',
    url: 'https://example.com/',
    favicon: '',
    description: '',
    notes: '',
    categoryId: 'tools',
    tags: [],
    favorite: false,
    sortOrder: 1,
    createdAt: 1,
    updatedAt: 1,
  }],
  updatedAt: 1,
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function jsonResponse(body, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: name => headers[name.toLowerCase()] || null },
    json: async () => body,
  }
}

describe('saveNavigationData', () => {
  it('explains expired or revoked administrator tokens', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ message: 'Bad credentials' }, 401)))
    await expect(verifyAdminToken('expired-token')).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('无效或已过期'),
    })
  })

  it('distinguishes API rate limits and exposes retry metadata', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(
      { message: 'API rate limit exceeded' },
      403,
      { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1794500000' },
    )))
    await expect(verifyAdminToken('rate-limited-token')).rejects.toMatchObject({
      status: 403,
      message: expect.stringContaining('请求次数已达上限'),
      rateLimitReset: '1794500000',
    })
  })

  it('reports a recoverable network message when the GitHub API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(verifyAdminToken('network-token')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: expect.stringContaining('检查网络或代理'),
    })
  })


  beforeEach(() => {
    clearAccessToken()
    setAccessToken('test-token')
  })

  afterEach(() => {
    clearAccessToken()
    vi.unstubAllGlobals()
  })

  it('rejects missing authorization before making a request', async () => {
    clearAccessToken()
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(baseline, baseline)).rejects.toThrow('请先使用 GitHub 管理员账号授权')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects invalid outgoing data before making a request', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const invalid = structuredClone(baseline)
    invalid.websites[0].url = 'javascript:alert(1)'

    await expect(saveNavigationData(invalid, baseline)).rejects.toThrow('只支持 HTTP 或 HTTPS')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not write when the remote baseline has changed', async () => {
    const remote = structuredClone(baseline)
    remote.websites[0].name = '由其他标签页更新'
    const fetch = vi.fn().mockResolvedValue(jsonResponse({
      sha: 'remote-file-sha',
      content: encodeBase64Utf8(remote),
    }))
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(baseline, baseline)).rejects.toMatchObject({
      status: 409,
      code: 'STALE_BASELINE',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].method).toBeUndefined()
  })

  it('writes validated data and preserves UTF-8 content', async () => {
    const updated = structuredClone(baseline)
    updated.websites[0].name = '中文示例站点'
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        sha: 'remote-file-sha',
        content: encodeBase64Utf8(baseline),
      }))
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: 'new-commit-sha' } }))
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(updated, baseline)).resolves.toBe('new-commit-sha')
    expect(fetch).toHaveBeenCalledTimes(2)
    const [url, options] = fetch.mock.calls[1]
    expect(url).toContain('/contents/public/data/navigation.json')
    expect(options.method).toBe('PUT')
    expect(fetch.mock.calls[0][1].cache).toBe('no-store')
    expect(options.headers.Authorization).toBe('Bearer test-token')
    const body = JSON.parse(options.body)
    const decoded = new TextDecoder().decode(Uint8Array.from(
      atob(body.content),
      character => character.charCodeAt(0),
    ))
    expect(JSON.parse(decoded).websites[0].name).toBe('中文示例站点')
    expect(body.sha).toBe('remote-file-sha')
  })


  it('accepts line-wrapped base64 content returned by the Contents API', async () => {
    const wrappedContent = encodeBase64Utf8(baseline).replace(/(.{64})/g, '$1\n')
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        sha: 'remote-file-sha',
        content: wrappedContent,
      }))
      .mockResolvedValueOnce(jsonResponse({ commit: { sha: 'wrapped-content-commit' } }))
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(baseline, baseline)).resolves.toBe('wrapped-content-commit')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('surfaces a GitHub write conflict without a blind retry', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        sha: 'remote-file-sha',
        content: encodeBase64Utf8(baseline),
      }))
      .mockResolvedValueOnce(jsonResponse({ message: 'sha does not match' }, 409))
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(baseline, baseline)).rejects.toMatchObject({ status: 409 })
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[1][1].method).toBe('PUT')
  })


  it('surfaces server write failures without retrying', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({
        sha: 'remote-file-sha',
        content: encodeBase64Utf8(baseline),
      }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Internal Server Error' }, 500))
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(baseline, baseline)).rejects.toMatchObject({ status: 500 })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not save when the expected baseline is missing or malformed', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    await expect(saveNavigationData(baseline, '')).rejects.toThrow('缺少远端数据基线')
    await expect(saveNavigationData(baseline, '{bad json')).rejects.toThrow('本地数据基线无效')
    expect(fetch).not.toHaveBeenCalled()
  })
})
