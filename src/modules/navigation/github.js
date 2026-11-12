import { normalizeNavigationData } from './validation'

const OWNER = 'shenshou'
const REPO = 'MyOnlineTools'
const BRANCH = 'main'
const DATA_PATH = 'public/data/navigation.json'
const API = 'https://api.github.com'

const TOKEN_KEY = 'mot-navigation-github-token'
let accessToken = readSessionToken()

function readSessionToken() {
  try { return typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_KEY) || '' : '' }
  catch { return '' }
}

function writeSessionToken(token) {
  try {
    if (typeof window === 'undefined') return
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token)
    else window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage can be unavailable in restricted browsing contexts; keep the token in memory.
  }
}

export function setAccessToken(token) {
  accessToken = typeof token === 'string' ? token.trim() : ''
  writeSessionToken(accessToken)
}

export function clearAccessToken() {
  accessToken = ''
  writeSessionToken('')
}

export async function restoreAdminSession() {
  const token = readSessionToken()
  if (!token) return null
  try {
    const account = await verifyAdminToken(token)
    accessToken = token
    return account
  } catch (error) {
    clearAccessToken()
    throw error
  }
}

async function api(path, options = {}, token = accessToken) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.message || `GitHub API 请求失败（${response.status}）`)
    error.status = response.status
    throw error
  }
  return body
}

export async function verifyAdminToken(token) {
  const candidate = typeof token === 'string' ? token.trim() : ''
  if (!candidate) throw new Error('请提供 GitHub 访问令牌')
  const data = await api(`/repos/${OWNER}/${REPO}`, {}, candidate)
  if (!data.permissions?.push) throw new Error('当前 GitHub 账号没有此仓库的写入权限')
  return data.full_name
}

function decodeBase64Utf8(value) {
  const binary = atob(String(value || '').replace(/\\s/g, ''))
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64Utf8(value) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary)
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export async function saveNavigationData(data, expectedBaseline) {
  if (!accessToken) throw new Error('请先使用 GitHub 管理员账号授权')
  if (!expectedBaseline) throw new Error('缺少远端数据基线。请重新加载 GitHub 最新数据后再保存。')

  // Validate before making any write request. The public JSON must never be replaced
  // with a malformed document, even if a caller bypasses the editor's form validation.
  const normalizedData = normalizeNavigationData(data)

  let expectedData
  try {
    const parsed = typeof expectedBaseline === 'string' ? JSON.parse(expectedBaseline) : expectedBaseline
    expectedData = normalizeNavigationData(parsed)
  } catch {
    throw new Error('本地数据基线无效，请重新加载后再保存')
  }

  const path = `/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`
  const current = await api(`${path}?ref=${BRANCH}`)
  let remoteData
  try {
    remoteData = normalizeNavigationData(JSON.parse(decodeBase64Utf8(current.content)))
  } catch {
    throw new Error('无法读取或校验 GitHub 当前数据，已取消保存以避免覆盖')
  }

  if (stableStringify(remoteData) !== stableStringify(expectedData)) {
    const error = new Error('远端网址数据已被其他标签页或操作更新。为避免覆盖，已取消本次保存；请重新加载并重新应用修改。')
    error.status = 409
    error.code = 'STALE_BASELINE'
    throw error
  }

  const encoded = encodeBase64Utf8(JSON.stringify(normalizedData, null, 2) + '\n')
  // GitHub's Contents API checks the file SHA again on PUT. A 409/422 response
  // here means the file changed after our baseline read; never retry blindly.
  const result = await api(path, {
    method: 'PUT',
    body: JSON.stringify({
      message: 'Update navigation data',
      content: encoded,
      sha: current.sha,
      branch: BRANCH,
    }),
  })
  return result.commit.sha
}

export async function fetchNavigationData() {
  const path = `/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}&_=${Date.now()}`

  if (accessToken) {
    const response = await fetch(API + path, {
      headers: {
        Accept: 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    })
    if (!response.ok) {
      const detail = await response.text()
      const error = new Error(`从 GitHub 读取最新网址数据失败（${response.status}）：${detail.slice(0, 180)}`)
      error.status = response.status
      throw error
    }
    return response.json()
  }

  const publicUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${DATA_PATH}?v=${Date.now()}`
  const response = await fetch(publicUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`读取公开网址数据失败（HTTP ${response.status}）`)
  return response.json()
}
