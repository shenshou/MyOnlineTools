export const JAVDB_BASE_URL = 'https://javdb.com'

export function normalizeMovieCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function parseMovieNumbers(input) {
  const seen = new Set()
  return String(input || '')
    .split(/[\\s,，;；]+/)
    .map(value => value.trim().toUpperCase())
    .filter(value => /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(value))
    .filter(value => {
      const normalized = normalizeMovieCode(value)
      if (!normalized || seen.has(normalized)) return false
      seen.add(normalized)
      return true
    })
}

export function isExactMovieCode(title, code) {
  const expected = normalizeMovieCode(code)
  if (!expected) return false

  const source = String(title || '').trim()
  let index = 0

  for (const char of expected) {
    while (index < source.length && /[\\s._-]/.test(source[index])) index += 1
    if (source[index]?.toUpperCase() !== char) return false
    index += 1
  }

  return !/[A-Za-z0-9]/.test(source[index] || '')
}

export function parseJavDbSearchResults(html, Parser = globalThis.DOMParser) {
  if (!Parser) throw new Error('当前环境不支持 HTML 解析')
  const document = new Parser().parseFromString(String(html || ''), 'text/html')
  const anchors = document.querySelectorAll(
    '.movie-list .item a[href*="/v/"], .video-list .item a[href*="/v/"]',
  )
  const seen = new Set()

  return [...anchors].flatMap(anchor => {
    const href = anchor.getAttribute('href')
    if (!href) return []
    let url
    try {
      url = new URL(href, JAVDB_BASE_URL)
    } catch {
      return []
    }
    const match = url.pathname.match(/^\\/v\\/([a-zA-Z0-9]+)(?:\\/|$)/)
    if (!match || seen.has(match[1])) return []
    seen.add(match[1])

    const title = anchor.querySelector('.video-title')?.textContent?.trim()
      || anchor.textContent?.trim()
      || ''

    return [{ title, url: url.href, movieId: match[1] }]
  })
}

export async function searchJavDbMovies(number, { signal } = {}) {
  const code = String(number || '').trim()
  if (!code) throw new Error('请输入番号')

  const url = new URL('/search', JAVDB_BASE_URL)
  url.searchParams.set('q', code)
  url.searchParams.set('f', 'all')

  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    throw Object.assign(new Error(error.message || 'JavDB 搜索请求失败'), { cause: error, url: url.href })
  }

  if (!response.ok) {
    throw Object.assign(new Error(`JavDB 搜索请求失败（HTTP ${response.status}）`), {
      status: response.status,
      url: response.url || url.href,
    })
  }

  const html = await response.text()
  return {
    results: parseJavDbSearchResults(html),
    status: response.status,
    url: response.url || url.href,
  }
}
