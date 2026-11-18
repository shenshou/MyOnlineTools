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
      const error = new Error(`搜索接口返回 HTTP ${response.status}${detail ? ' · ' + detail.slice(0, 220) : ''}`)
      error.status = response.status
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

export async function searchLtxItems(code, { onStage } = {}) {
  const normalizedCode = String(code || '').trim()
  if (!normalizedCode) throw new Error('请输入番号')

  const requestUrl = API_ORIGIN + '/api/items/query'
  const body = {
    q: normalizedCode,
    actor: null,
    status: 'all',
    genres: [],
    maker: null,
    type: null,
    sub: false,
    sort: { field: 'added', dir: 'desc' },
    randomSeed: null,
    limit: 60,
    metadata: false,
    offset: 0,
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const session = await negotiateSession(onStage)
    const requestId = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
    onStage?.('正在发送番号搜索请求')

    const response = await fetch(requestUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-LTX-Session': session.sid,
        'X-LTX-Request': requestId,
      },
      body: JSON.stringify(body),
    })

    if (response.status === 428 && attempt === 0) {
      const challenge = await response.clone().json().catch(() => null)
      if (challenge?.reason === 'cryptoSession') {
        cachedSession = null
        continue
      }
    }

    onStage?.('正在校验并解密搜索响应')
    const result = await decryptResponse(response, session, requestId, requestUrl, 'POST')
    if (!result || !Array.isArray(result.items)) {
      throw new Error('响应已解密，但未找到预期的 items 数组')
    }
    return result
  }

  throw new Error('加密会话重建后仍无法完成请求')
}


function normalizeLtxCode(code) {
  return String(code ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[\\u2010-\\u2015\\u2212]/g, '-')
    .replace(/\\s+/g, '')
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
  return hasExactLtxCode(result.items, code)
}
