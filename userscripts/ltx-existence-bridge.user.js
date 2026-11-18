// ==UserScript==
// @name         LTX 番号存在性检测桥接
// @namespace    https://shenshou.github.io/MyOnlineTools/
// @version      1.0.0
// @description  在 LTX 官方页面同源环境中执行番号存在性检测，并只向调用页面返回 true/false。
// @match        https://ltxlib.dpdns.org/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict'

  const TOOL_ORIGIN = 'https://shenshou.github.io'
  const REQUEST_MESSAGE = 'LTX_CODE_CHECK_REQUEST'
  const READY_MESSAGE = 'LTX_CODE_BRIDGE_READY'
  const RESULT_MESSAGE = 'LTX_CODE_CHECK_RESULT'
  const RESPONSE_CONTENT_TYPE = 'application/vnd.ltx.encrypted+json'
  const RESPONSE_CONTEXT = 'ltx-api-response-v1'
  const encoder = new TextEncoder()
  let currentRequest = null

  const encodeBase64Url = bytes => {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const decodeBase64Url = value => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
      throw new Error('LTX 加密响应格式无效')
    }
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4))
    return Uint8Array.from(binary, char => char.charCodeAt(0))
  }

  const normalizeCode = value => String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\s+/g, '')

  function responseAad(sessionId, requestId, method, pathname, status, encoding) {
    return encoder.encode(JSON.stringify([
      RESPONSE_CONTEXT,
      sessionId,
      requestId,
      method.toUpperCase(),
      pathname,
      status,
      encoding,
    ]))
  }

  async function createSession() {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits'],
    )
    const publicKey = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)))
    const response = await fetch('/api/crypto/session', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: 1, publicKey }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error('LTX 会话协商失败：HTTP ' + response.status + (detail ? ' · ' + detail.slice(0, 160) : ''))
    }

    const payload = await response.json()
    if (payload.v !== 1 || typeof payload.sid !== 'string' || !payload.sid ||
        !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) {
      throw new Error('LTX 会话响应结构不正确')
    }

    const serverPublicKey = decodeBase64Url(payload.publicKey)
    const salt = decodeBase64Url(payload.salt)
    if (serverPublicKey.length !== 65 || salt.length !== 32) throw new Error('LTX 会话密钥材料长度不正确')

    const imported = await crypto.subtle.importKey(
      'raw', serverPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
    )
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: imported }, pair.privateKey, 256)
    const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey'])
    const key = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: encoder.encode(RESPONSE_CONTEXT + ':' + payload.sid),
      },
      hkdf,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    return { sid: payload.sid, key, expiresAt: payload.expiresAt }
  }

  async function requestApi(path, method = 'GET', body, session = null) {
    const activeSession = session || await createSession()
    const requestId = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
    const headers = {
      'X-LTX-Session': activeSession.sid,
      'X-LTX-Request': requestId,
    }
    const options = { method, credentials: 'include', headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }

    const response = await fetch(path, options)
    const contentType = (response.headers.get('content-type') || '').split(';', 1)[0].trim().toLowerCase()
    if (contentType !== RESPONSE_CONTENT_TYPE) {
      const detail = await response.text().catch(() => '')
      let payload = null
      try { payload = JSON.parse(detail) } catch {}
      if (!response.ok) {
        const error = new Error('LTX 接口返回 HTTP ' + response.status + (detail ? ' · ' + detail.slice(0, 180) : ''))
        error.status = response.status
        error.reason = payload?.reason
        throw error
      }
      throw new Error('LTX 接口返回了非预期的响应格式')
    }

    const encrypted = await response.json()
    if (encrypted.v !== 1 || encrypted.sid !== activeSession.sid ||
        encrypted.rid !== requestId || !['identity', 'gzip'].includes(encrypted.encoding)) {
      throw new Error('LTX 加密响应校验失败')
    }

    const iv = decodeBase64Url(encrypted.iv)
    if (iv.length !== 12) throw new Error('LTX AES-GCM IV 长度不正确')
    const url = new URL(path, location.origin)
    const plaintext = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: responseAad(
          activeSession.sid,
          requestId,
          method,
          url.pathname + url.search,
          response.status,
          encrypted.encoding,
        ),
      },
      activeSession.key,
      decodeBase64Url(encrypted.body),
    )

    let decoded = plaintext
    if (encrypted.encoding === 'gzip') {
      const stream = new Blob([plaintext]).stream().pipeThrough(new DecompressionStream('gzip'))
      decoded = await new Response(stream).arrayBuffer()
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded))
  }

  async function checkExists(rawCode) {
    const code = normalizeCode(rawCode)
    if (!code) throw new Error('番号为空')
    if (code.length > 64) throw new Error('番号长度超过 64 个字符')

    for (let snapshotAttempt = 0; snapshotAttempt < 2; snapshotAttempt += 1) {
      const session = await createSession()
      const catalogue = await requestApi('/api/items', 'GET', undefined, session)
      if (!catalogue || typeof catalogue.snapshot !== 'string' || !catalogue.snapshot) {
        throw new Error('LTX 资源库初始化响应缺少 snapshot')
      }

      const baseBody = {
        q: code,
        actor: null,
        status: 'all',
        genres: [],
        maker: null,
        type: null,
        sub: false,
        sort: { field: 'added', dir: 'desc' },
        randomSeed: null,
        snapshot: catalogue.snapshot,
        limit: 60,
        metadata: true,
      }

      let expectedTotal = null
      let expectedSnapshot = null
      let offset = 0

      try {
        for (let pageNumber = 0; pageNumber < 1000; pageNumber += 1) {
          const page = await requestApi('/api/items/query', 'POST', {
            ...baseBody,
            offset,
            metadata: offset === 0,
          }, session)

          if (!page || !Array.isArray(page.items)) throw new Error('LTX 搜索响应缺少 items 数组')
          if (page.items.some(item => normalizeCode(item?.code) === code)) return true
          if (!Number.isSafeInteger(page.total) || page.total < 0 ||
              typeof page.snapshot !== 'string' || !page.snapshot ||
              !Number.isSafeInteger(page.offset) || page.offset !== offset) {
            throw new Error('LTX 搜索分页元数据不完整')
          }

          if (expectedTotal === null) {
            expectedTotal = page.total
            expectedSnapshot = page.snapshot
          } else if (page.total !== expectedTotal || page.snapshot !== expectedSnapshot) {
            throw new Error('LTX 搜索期间资源库版本发生变化')
          }

          const nextOffset = page.offset + page.items.length
          if (nextOffset >= expectedTotal) return false
          if (page.items.length === 0) throw new Error('LTX 搜索分页提前结束')
          offset = nextOffset
        }
        throw new Error('LTX 搜索分页超过安全上限')
      } catch (error) {
        if (['snapshotExpired', 'cryptoSession'].includes(error?.reason) && snapshotAttempt === 0) continue
        throw error
      }
    }

    throw new Error('LTX 资源库版本过期，重试后仍无法完成检测')
  }

  function sendResult(requestId, result) {
    if (!window.opener || window.opener.closed) return
    window.opener.postMessage({
      type: RESULT_MESSAGE,
      requestId,
      ...result,
    }, TOOL_ORIGIN)
  }

  window.addEventListener('message', async event => {
    if (event.origin !== TOOL_ORIGIN || event.source !== window.opener) return
    const message = event.data
    if (!message || message.type !== REQUEST_MESSAGE ||
        typeof message.requestId !== 'string' ||
        !/^[a-f0-9]{32}$/.test(message.requestId) ||
        typeof message.code !== 'string' || currentRequest) return

    currentRequest = message.requestId
    try {
      const exists = await checkExists(message.code)
      sendResult(message.requestId, { ok: true, exists })
    } catch (error) {
      sendResult(message.requestId, { ok: false, error: error?.message || 'LTX 检测失败' })
    } finally {
      currentRequest = null
    }
  })

  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({ type: READY_MESSAGE }, TOOL_ORIGIN)
  }
})()
