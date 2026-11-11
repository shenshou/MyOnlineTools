const OWNER = 'shenshou'
const REPO = 'MyOnlineTools'
const BRANCH = 'main'
const DATA_PATH = 'public/data/navigation.json'
const API = 'https://api.github.com'

const TOKEN_KEY = 'mot-navigation-github-token'
let accessToken = typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_KEY) || '' : ''

export function setAccessToken(token) {
  accessToken = token || ''
  if (typeof window !== 'undefined') {
    if (accessToken) window.sessionStorage.setItem(TOKEN_KEY, accessToken)
    else window.sessionStorage.removeItem(TOKEN_KEY)
  }
}

export function clearAccessToken() {
  accessToken = ''
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(TOKEN_KEY)
}

export async function restoreAdminSession() {
  const token = typeof window !== 'undefined' ? window.sessionStorage.getItem(TOKEN_KEY) : ''
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

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
  const previous = accessToken
  accessToken = token
  try {
    const data = await api(`/repos/${OWNER}/${REPO}`)
    if (!data.permissions?.push) throw new Error('当前 GitHub 账号没有此仓库的写入权限')
    return data.full_name
  } catch (error) {
    accessToken = previous
    throw error
  }
}

export async function saveNavigationData(data) {
  if (!accessToken) throw new Error('请先使用 GitHub 管理员账号授权')
  const path = `/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`
  const current = await api(`${path}?ref=${BRANCH}`)
  const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2) + '\n')
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  const encoded = btoa(binary)
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

  // 管理员已登录时，通过 Contents API 读取 main 分支的最新文件，
  // 避免 raw 文件 CDN 缓存短暂落后于刚提交的数据。
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
    const content = await response.text()
    const parsed = JSON.parse(content)
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.websites)) {
      throw new Error('GitHub 返回的网址数据格式不正确')
    }
    return parsed
  }

  // 普通访客读取公开 JSON；使用唯一查询参数绕过中间缓存。
  const publicUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${DATA_PATH}?v=${Date.now()}`
  const response = await fetch(publicUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error(`读取公开网址数据失败（HTTP ${response.status}）`)
  const parsed = await response.json()
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.categories) || !Array.isArray(parsed.websites)) {
    throw new Error('公开网址数据格式不正确')
  }
  return parsed
}
