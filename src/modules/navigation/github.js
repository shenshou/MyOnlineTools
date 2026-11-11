const OWNER = 'shenshou'
const REPO = 'MyOnlineTools'
const BRANCH = 'main'
const DATA_PATH = 'public/data/navigation.json'
const API = 'https://api.github.com'

let accessToken = ''

export function setAccessToken(token) { accessToken = token || '' }
export function clearAccessToken() { accessToken = '' }

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
