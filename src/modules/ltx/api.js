const API_ORIGIN = 'https://ltxlib.dpdns.org'
const SESSION_PATH = '/api/crypto/session'
const RESPONSE_CONTENT_TYPE = 'application/vnd.ltx.encrypted+json'
const RESPONSE_CONTEXT = 'ltx-api-response-v1'
const SESSION_CONTEXT = 'ltx-api-response-v1'

let cachedSession = null
let pendingSession = null

function encodeBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
    throw new Error('加密响应中的 Base64URL 数据格式无效')
  }
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4))
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

function utf8(value) {
  return new TextEncoder().encode(value)
}

function makeResponseAad(sessionId, requestId, method, pathAndQuery, status, encoding) {
  return utf8(JSON.stringify([
    RESPONSE_CONTEXT,
    sessionId,
    requestId,
    method.toUpperCase(),
    pathAndQuery,
    status,
    encoding,
  ]))
}

async function negotiateSession(onStage) {
  if (cachedSession && cachedSession.expiresAt > Date.now() + 5000) return cachedSession
  if (pendingSession) return pendingSession

  pendingSession = (async () => {
    onStage?.('正在建立 ECDH 加密会话')
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    )
    const publicKey = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)))
    const response = await fetch(API_ORIGIN + SESSION_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: 1, publicKey }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      const error = new Error(`会话协商失败：HTTP ${response.status}${detail ? ' · ' + detail.slice(0, 180) : ''}`)
      error.status = response.status
      throw error
    }

    const payload = await response.json()
    if (
      payload.v !== 1 ||
      typeof payload.sid !== 'string' ||
      !payload.sid ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Date.now()
    ) {
      throw new Error('会话接口返回的数据结构不符合预期')
    }

    const serverPublicKey = decodeBase64Url(payload.publicKey)
    const salt = decodeBase64Url(payload.salt)
    if (serverPublicKey.length !== 65 || salt.length !== 32) {
      throw new Error('会话公钥或 salt 长度不符合协议要求')
    }

    onStage?.('正在派生 AES-256-GCM 解密密钥')
    const importedServerKey = await crypto.subtle.importKey(
      'raw',
      serverPublicKey,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      [],
    )
    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: importedServerKey },
      keyPair.privateKey,
      256,
    )
    const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey'])
    const decryptKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: utf8(`${SESSION_CONTEXT}:${payload.sid}`),
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    cachedSession = {
      sid: payload.sid,
      key: decryptKey,
      expiresAt: payload.expiresAt,
    }
    return cachedSession
  })()

  try {
    return await pendingSession
  } finally {
    pendingSession = null
  }
}

async function decryptResponse(response, session, requestId, requestUrl, method) {
  const contentType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase()
  if (contentType !== RESPONSE_CONTENT_TYPE) {
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      let payload = null
      try { payload = JSON.parse(detail) } catch {}
      const error = new Error(`搜索接口返回 HTTP ${response.status}${detail ? ' · ' + detail.slice(0, 220) : ''}`)
      error.status = response.status
      error.reason = payload?.reason
      throw error
    }
    throw new Error(`响应未使用预期的加密格式（Content-Type: ${contentType || '未提供'}）`)
  }

  const encrypted = await response.json()
  if (
    encrypted.v !== 1 ||
    encrypted.sid !== session.sid ||
    encrypted.rid !== requestId ||
    !['identity', 'gzip'].includes(encrypted.encoding)
  ) {
    throw new Error('加密响应的版本、会话 ID、请求 ID 或编码字段校验失败')
  }

  const iv = decodeBase64Url(encrypted.iv)
  if (iv.length !== 12) throw new Error('AES-GCM IV 长度不正确')

  const url = new URL(requestUrl)
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: makeResponseAad(
        session.sid,
        requestId,
        method,
        url.pathname + url.search,
        response.status,
        encrypted.encoding,
      ),
    },
    session.key,
    decodeBase64Url(encrypted.body),
  )

  let decoded = plaintext
  if (encrypted.encoding === 'gzip') {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持 DecompressionStream，无法解压 Gzip 响应')
    }
    const stream = new Blob([plaintext]).stream().pipeThrough(new DecompressionStream('gzip'))
    decoded = await new Response(stream).arrayBuffer()
  }

  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded))
}

async function requestLtxApi(path, { method = 'GET', body, onStage } = {}) {
  const requestUrl = API_ORIGIN + path

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const session = await negotiateSession(onStage)
    const requestId = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
    const headers = {
      'X-LTX-Session': session.sid,
      'X-LTX-Request': requestId,
    }
    const requestOptions = {
      method,
      credentials: 'include',
      headers,
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      requestOptions.body = JSON.stringify(body)
    }

    const response = await fetch(requestUrl, requestOptions)

    if (response.status === 428 && attempt === 0) {
      const challenge = await response.clone().json().catch(() => null)
      if (challenge?.reason === 'cryptoSession') {
        cachedSession = null
        continue
      }
    }

    onStage?.('正在校验并解密搜索响应')
    return decryptResponse(response, session, requestId, requestUrl, method)
  }

  throw new Error('加密会话重建后仍无法完成请求')
}

export async function findExactLtxCodeInPages(firstPage, fetchPage, targetCode) {
  let page = firstPage
  let expectedOffset = 0
  let expectedTotal = null
  let expectedSnapshot = null

  for (let pageNumber = 0; pageNumber < 1000; pageNumber += 1) {
    if (!page || !Array.isArray(page.items)) {
      throw new Error('搜索响应缺少有效的 items 数组，无法确认番号是否存在')
    }

    if (hasExactLtxCode(page.items, targetCode)) return true

    if (!Number.isSafeInteger(page.total) || page.total < 0) {
      throw new Error('搜索响应缺少有效的 total，无法确认番号不存在')
    }
    if (!Number.isSafeInteger(page.offset) || page.offset !== expectedOffset) {
      throw new Error('搜索分页位置不连续，无法确认番号不存在')
    }
    if (expectedTotal === null) {
      expectedTotal = page.total
      expectedSnapshot = page.snapshot
    } else if (page.total !== expectedTotal || page.snapshot !== expectedSnapshot) {
      throw new Error('搜索结果版本发生变化，无法确认番号不存在')
    }

    const nextOffset = page.offset + page.items.length
    if (nextOffset >= expectedTotal) return false
    if (page.items.length === 0) {
      throw new Error('搜索分页提前结束，无法确认番号不存在')
    }

    expectedOffset = nextOffset
    page = await fetchPage(expectedOffset)
  }

  throw new Error('搜索结果分页数量超出安全上限，无法确认番号是否存在')
}

async function searchLtxItems(code, { onStage } = {}) {
  const normalizedCode = String(code || '').trim()
  if (!normalizedCode) throw new Error('请输入番号')

  for (let snapshotAttempt = 0; snapshotAttempt < 2; snapshotAttempt += 1) {
    onStage?.('正在获取资源库版本')
    const catalogue = await requestLtxApi('/api/items', { onStage })
    if (!catalogue || typeof catalogue.snapshot !== 'string' || !catalogue.snapshot) {
      throw new Error('资源库初始化响应缺少 snapshot，无法执行可靠搜索')
    }

    const snapshot = catalogue.snapshot
    const baseBody = {
      q: normalizedCode,
      actor: null,
      status: 'all',
      genres: [],
      maker: null,
      type: null,
      sub: false,
      sort: { field: 'added', dir: 'desc' },
      randomSeed: null,
      snapshot,
      limit: 60,
      metadata: true,
    }

    const fetchPage = offset => requestLtxApi('/api/items/query', {
      method: 'POST',
      onStage,
      body: {
        ...baseBody,
        offset,
        metadata: offset === 0,
      },
    })

    try {
      const firstPage = await fetchPage(0)
      const exists = await findExactLtxCodeInPages(firstPage, async offset => {
        onStage?.(`正在检查搜索结果（${offset + 1} 起）`)
        return fetchPage(offset)
      }, normalizedCode)
      return { exists }
    } catch (error) {
      if (error?.reason === 'snapshotExpired' && snapshotAttempt === 0) continue
      throw error
    }
  }

  throw new Error('资源库版本已过期，重建后仍无法完成搜索')
}


function normalizeLtxCode(code) {
  return String(code ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '')
}

// Match only the official item.code field; a fuzzy search hit is not a positive result.
export function hasExactLtxCode(items, targetCode) {
  const target = normalizeLtxCode(targetCode)
  if (!target || !Array.isArray(items)) return false

  return items.some(item => normalizeLtxCode(item?.code) === target)
}

// Public minimal-result API: callers receive only a boolean, never the item records.
export async function checkLtxCodeExists(code, options) {
  const result = await searchLtxItems(code, options)
  return result.exists
}
