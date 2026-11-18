// ==UserScript==
// @name         LTX 批量番号存在性检测
// @namespace    https://github.com/shenshou/MyOnlineTools
// @version      1.0.0
// @description  在 LTX 官方网站内批量检测番号是否存在，只输出精确匹配结果。
// @match        https://ltxlib.dpdns.org/*
// @downloadURL  https://raw.githubusercontent.com/shenshou/MyOnlineTools/main/userscripts/ltx-batch-checker.user.js
// @updateURL    https://raw.githubusercontent.com/shenshou/MyOnlineTools/main/userscripts/ltx-batch-checker.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict'
  const RESPONSE_CONTENT_TYPE = 'application/vnd.ltx.encrypted+json'
  const RESPONSE_CONTEXT = 'ltx-api-response-v1'
  const MAX_BATCH_SIZE = 300
  const PAGE_SIZE = 60
  const REQUEST_GAP_MS = 1000
  const encoder = new TextEncoder()
  let activeSession = null
  let catalogueSnapshot = null
  let activeController = null
  let running = false
  let results = []

  const normalizeCode = value => String(value ?? '').normalize('NFKC').trim().toUpperCase()
    .replace(/[\u2010-\u2015\u2212]/g, '-').replace(/\s+/g, '')

  function encodeBase64Url(bytes) {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  function decodeBase64Url(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) {
      throw new Error('LTX 加密响应中的 Base64URL 格式无效')
    }
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4))
    return Uint8Array.from(binary, char => char.charCodeAt(0))
  }
  function responseAad(sessionId, requestId, method, pathname, status, encoding) {
    return encoder.encode(JSON.stringify([RESPONSE_CONTEXT, sessionId, requestId, method.toUpperCase(), pathname, status, encoding]))
  }
  function createHttpError(response, detail, payload) {
    const error = new Error('LTX 接口返回 HTTP ' + response.status + (detail ? ' · ' + detail.slice(0, 180) : ''))
    error.status = response.status
    error.reason = payload?.reason
    error.retryAfter = response.headers.get('retry-after')
    return error
  }

  async function createSession(signal) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
    const publicKey = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)))
    const response = await fetch('/api/crypto/session', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ v: 1, publicKey }), signal,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      let payload = null
      try { payload = JSON.parse(detail) } catch {}
      throw createHttpError(response, detail, payload)
    }
    const payload = await response.json()
    if (payload.v !== 1 || typeof payload.sid !== 'string' || !payload.sid ||
        !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) {
      throw new Error('LTX 会话响应结构不正确')
    }
    const serverPublicKey = decodeBase64Url(payload.publicKey)
    const salt = decodeBase64Url(payload.salt)
    if (serverPublicKey.length !== 65 || salt.length !== 32) throw new Error('LTX 会话密钥材料长度不正确')
    const imported = await crypto.subtle.importKey('raw', serverPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
    const shared = await crypto.subtle.deriveBits({ name: 'ECDH', public: imported }, pair.privateKey, 256)
    const hkdf = await crypto.subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey'])
    const key = await crypto.subtle.deriveKey({
      name: 'HKDF', hash: 'SHA-256', salt,
      info: encoder.encode(RESPONSE_CONTEXT + ':' + payload.sid),
    }, hkdf, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])
    return { sid: payload.sid, key, expiresAt: payload.expiresAt }
  }

  async function ensureSession(signal) {
    if (!activeSession || activeSession.expiresAt <= Date.now() + 5000) activeSession = await createSession(signal)
    return activeSession
  }

  async function requestApi(path, method = 'GET', body, signal) {
    const session = await ensureSession(signal)
    const requestId = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
    const headers = { 'X-LTX-Session': session.sid, 'X-LTX-Request': requestId }
    const options = { method, credentials: 'include', headers, signal }
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
      if (!response.ok) throw createHttpError(response, detail, payload)
      throw new Error('LTX 接口返回了非预期的响应格式')
    }
    const encrypted = await response.json()
    if (encrypted.v !== 1 || encrypted.sid !== session.sid || encrypted.rid !== requestId ||
        !['identity', 'gzip'].includes(encrypted.encoding)) throw new Error('LTX 加密响应校验失败')
    const iv = decodeBase64Url(encrypted.iv)
    if (iv.length !== 12) throw new Error('LTX AES-GCM IV 长度不正确')
    const url = new URL(path, location.origin)
    const plaintext = await crypto.subtle.decrypt({
      name: 'AES-GCM', iv,
      additionalData: responseAad(session.sid, requestId, method, url.pathname + url.search, response.status, encrypted.encoding),
    }, session.key, decodeBase64Url(encrypted.body))
    let decoded = plaintext
    if (encrypted.encoding === 'gzip') {
      if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持 Gzip 解压')
      const stream = new Blob([plaintext]).stream().pipeThrough(new DecompressionStream('gzip'))
      decoded = await new Response(stream).arrayBuffer()
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded))
  }

  async function refreshCatalogue(signal) {
    const catalogue = await requestApi('/api/items', 'GET', undefined, signal)
    if (!catalogue || typeof catalogue.snapshot !== 'string' || !catalogue.snapshot) {
      throw new Error('LTX 资源库初始化响应缺少 snapshot')
    }
    catalogueSnapshot = catalogue.snapshot
  }

  async function checkOne(rawCode, signal) {
    const code = normalizeCode(rawCode)
    if (!code) throw new Error('番号为空')
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        if (!catalogueSnapshot) await refreshCatalogue(signal)
        const baseBody = {
          q: code, actor: null, status: 'all', genres: [], maker: null, type: null, sub: false,
          sort: { field: 'added', dir: 'desc' }, randomSeed: null, snapshot: catalogueSnapshot,
          limit: PAGE_SIZE, metadata: true,
        }
        let expectedTotal = null
        let expectedSnapshot = null
        let offset = 0
        for (let pageNumber = 0; pageNumber < 1000; pageNumber += 1) {
          const page = await requestApi('/api/items/query', 'POST', {
            ...baseBody, snapshot: expectedSnapshot || catalogueSnapshot, offset, metadata: offset === 0,
          }, signal)
          if (!page || !Array.isArray(page.items)) throw new Error('LTX 搜索响应缺少 items 数组')
          if (page.items.some(item => normalizeCode(item?.code) === code)) return true
          if (!Number.isSafeInteger(page.total) || page.total < 0 ||
              typeof page.snapshot !== 'string' || !page.snapshot ||
              !Number.isSafeInteger(page.offset) || page.offset !== offset) {
            throw new Error('LTX 搜索分页元数据不完整，不能判定为不存在')
          }
          if (expectedTotal === null) {
            expectedTotal = page.total
            expectedSnapshot = page.snapshot
          } else if (page.total !== expectedTotal || page.snapshot !== expectedSnapshot) {
            throw new Error('LTX 搜索期间资源库版本发生变化，不能判定为不存在')
          }
          const nextOffset = page.offset + page.items.length
          if (nextOffset >= expectedTotal) return false
          if (page.items.length === 0) throw new Error('LTX 搜索分页提前结束，不能判定为不存在')
          offset = nextOffset
        }
        throw new Error('LTX 搜索分页超过安全上限')
      } catch (error) {
        if (attempt === 0 && ['snapshotExpired', 'cryptoSession'].includes(error?.reason)) {
          if (error.reason === 'cryptoSession') activeSession = null
          catalogueSnapshot = null
          continue
        }
        throw error
      }
    }
    throw new Error('LTX 资源库版本过期，重试后仍无法完成检测')
  }

  function parseInput(value) {
    const seen = new Set()
    const codes = []
    for (const part of value.split(/[\r\n,，;；]+/)) {
      const code = normalizeCode(part)
      if (!code || seen.has(code) || code.length > 64) continue
      seen.add(code)
      codes.push(code)
    }
    return codes
  }
  function retryDelay(error) {
    if (error?.status !== 429 || !error.retryAfter) return null
    const seconds = Number(error.retryAfter)
    const target = Number.isFinite(seconds) ? seconds * 1000 : Math.max(0, Date.parse(error.retryAfter) - Date.now())
    return Number.isFinite(target) ? target : null
  }
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new DOMException('已取消', 'AbortError'))
      const timer = setTimeout(resolve, ms)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('已取消', 'AbortError'))
      }, { once: true })
    })
  }
  function statusLabel(status) {
    return ({ queued: '等待中', checking: '检测中', exists: '存在', missing: '不存在', error: '检测失败', stopped: '未执行' })[status] || status
  }

  const host = document.createElement('div')
  host.id = 'ltx-batch-checker-root'
  const shadow = host.attachShadow({ mode: 'open' })
  const style = document.createElement('style')
  style.textContent = ':host{all:initial}*{box-sizing:border-box}' +
    '.launcher{position:fixed;right:22px;bottom:22px;z-index:2147483647;border:0;border-radius:999px;padding:11px 16px;background:#2563eb;color:#fff;font:600 13px/1.2 system-ui;box-shadow:0 8px 28px #0004;cursor:pointer}' +
    '.panel{position:fixed;right:22px;bottom:22px;z-index:2147483647;width:min(440px,calc(100vw - 28px));max-height:min(78vh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #cbd5e1;border-radius:14px;background:#fff;color:#0f172a;box-shadow:0 18px 60px #0005;font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}' +
    '.panel[hidden],.launcher[hidden]{display:none}.head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#0f172a;color:#fff}' +
    '.brand{font-size:14px;font-weight:700}.sub{display:block;margin-top:2px;color:#cbd5e1;font-size:10px;font-weight:400}' +
    'button{font:inherit;cursor:pointer}.head button{border:0;background:transparent;color:#fff;font-size:19px;line-height:1}.body{padding:13px;overflow:auto}' +
    '.hint{margin:0 0 8px;color:#475569;font-size:11px}textarea{display:block;width:100%;min-height:112px;resize:vertical;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#0f172a;font:12px/1.5 ui-monospace,monospace;outline:none}' +
    'textarea:focus{border-color:#2563eb;box-shadow:0 0 0 2px #2563eb22}.actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}' +
    '.actions button{border:1px solid #cbd5e1;border-radius:7px;padding:7px 10px;background:#fff;color:#0f172a;font-size:11px}.actions .primary{border-color:#2563eb;background:#2563eb;color:#fff}' +
    '.actions button:disabled{opacity:.45;cursor:not-allowed}.summary{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 8px;color:#475569;font-size:11px}.summary b{color:#0f172a}' +
    '.progress{height:5px;overflow:hidden;border-radius:9px;background:#e2e8f0}.bar{height:100%;width:0;background:#2563eb;transition:width .15s}' +
    '.message{margin:8px 0;color:#475569;font-size:11px;overflow-wrap:anywhere}.message.warn{color:#b45309}.message.error{color:#b91c1c}' +
    '.results{max-height:260px;overflow:auto;border:1px solid #e2e8f0;border-radius:8px}table{width:100%;border-collapse:collapse;font-size:11px}' +
    'th,td{padding:7px 8px;text-align:left;border-bottom:1px solid #e2e8f0}th{position:sticky;top:0;background:#f8fafc;color:#475569;font-weight:600}tr:last-child td{border-bottom:0}' +
    '.exists{color:#15803d;font-weight:700}.missing{color:#b91c1c;font-weight:700}.error-status{color:#b45309;font-weight:700}.foot{margin:9px 0 0;color:#64748b;font-size:10px}'
  shadow.append(style)

  const launcher = document.createElement('button')
  launcher.className = 'launcher'
  launcher.textContent = 'LTX 批量检测'
  launcher.hidden = true
  const panel = document.createElement('section')
  panel.className = 'panel'
  panel.innerHTML = '<header class="head"><div class="brand">LTX 批量番号检测<span class="sub">同源查询 · 精确匹配 · 不保存作品详情</span></div><button type="button" class="minimize" title="收起面板" aria-label="收起面板">−</button></header>' +
    '<div class="body"><p class="hint">每行一个番号，也支持逗号或分号分隔；单次最多 300 个，按顺序逐个查询。</p>' +
    '<textarea class="input" placeholder="IPX-811&#10;SSIS-123&#10;ABW-208"></textarea>' +
    '<div class="actions"><button type="button" class="primary start">开始检测</button><button type="button" class="cancel" disabled>停止</button>' +
    '<button type="button" class="copy" disabled>复制结果</button><button type="button" class="export" disabled>导出 CSV</button><button type="button" class="clear">清空</button></div>' +
    '<div class="summary"><span>总数 <b class="total">0</b></span><span>存在 <b class="yes">0</b></span><span>不存在 <b class="no">0</b></span><span>失败 <b class="failed">0</b></span></div>' +
    '<div class="progress"><div class="bar"></div></div><p class="message" role="status">等待输入番号。</p>' +
    '<div class="results"><table><thead><tr><th>番号</th><th>结果</th></tr></thead><tbody></tbody></table></div>' +
    '<p class="foot">检测请求直接发送至 LTX 官方站点。遇到 403 会停止后续任务；遇到 429 会遵循 Retry-After，不会把失败当作不存在。</p></div>'
  shadow.append(launcher, panel)

  const $ = selector => shadow.querySelector(selector)
  const input = $('.input')
  const startButton = $('.start')
  const cancelButton = $('.cancel')
  const copyButton = $('.copy')
  const exportButton = $('.export')
  const message = $('.message')
  const tbody = $('tbody')
  const bar = $('.bar')

  function renderSummary() {
    const total = results.length
    const yes = results.filter(item => item.status === 'exists').length
    const no = results.filter(item => item.status === 'missing').length
    const failed = results.filter(item => item.status === 'error').length
    $('.total').textContent = String(total)
    $('.yes').textContent = String(yes)
    $('.no').textContent = String(no)
    $('.failed').textContent = String(failed)
    const completed = yes + no + failed
    bar.style.width = total ? (completed / total * 100) + '%' : '0%'
    copyButton.disabled = completed === 0
    exportButton.disabled = completed === 0
  }
  function renderRows() {
    tbody.replaceChildren()
    for (const item of results) {
      const row = document.createElement('tr')
      const codeCell = document.createElement('td')
      const statusCell = document.createElement('td')
      codeCell.textContent = item.code
      statusCell.textContent = statusLabel(item.status) + (item.error ? '：' + item.error : '')
      if (item.status === 'exists') statusCell.className = 'exists'
      if (item.status === 'missing') statusCell.className = 'missing'
      if (item.status === 'error') statusCell.className = 'error-status'
      row.append(codeCell, statusCell)
      tbody.append(row)
    }
    renderSummary()
  }
  function setMessage(text, type = '') {
    message.textContent = text
    message.className = 'message' + (type ? ' ' + type : '')
  }
  function setRunning(value) {
    running = value
    startButton.disabled = value
    cancelButton.disabled = !value
    input.disabled = value
  }
  function exportText() {
    const rows = [['番号', '结果', '错误']]
    for (const item of results) rows.push([item.code, statusLabel(item.status), item.error || ''])
    return rows.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n')
  }

  async function runBatch() {
    if (running) return
    const codes = parseInput(input.value)
    if (codes.length === 0) return setMessage('没有识别到有效番号。', 'warn')
    if (codes.length > MAX_BATCH_SIZE) {
      return setMessage('本次识别到 ' + codes.length + ' 个番号，超过单批上限 ' + MAX_BATCH_SIZE + ' 个。请分批检测。', 'warn')
    }
    activeController = new AbortController()
    const signal = activeController.signal
    results = codes.map(code => ({ code, status: 'queued', error: '' }))
    renderRows()
    setRunning(true)
    setMessage('已载入 ' + codes.length + ' 个番号，开始按顺序检测。')
    try {
      for (let index = 0; index < results.length; index += 1) {
        if (signal.aborted) break
        const item = results[index]
        item.status = 'checking'
        renderRows()
        setMessage('正在检测 ' + (index + 1) + '/' + results.length + '：' + item.code)
        try {
          let exists
          try {
            exists = await checkOne(item.code, signal)
          } catch (error) {
            if (error?.status === 429) {
              const delay = retryDelay(error)
              if (delay === null || delay > 15 * 60 * 1000) throw error
              setMessage('收到 HTTP 429，遵循服务器 Retry-After，' + Math.ceil(delay / 1000) + ' 秒后重试当前番号。', 'warn')
              await sleep(delay, signal)
              exists = await checkOne(item.code, signal)
            } else if (!error?.status && error?.name !== 'AbortError') {
              await sleep(1500, signal)
              exists = await checkOne(item.code, signal)
            } else throw error
          }
          item.status = exists ? 'exists' : 'missing'
          item.error = ''
        } catch (error) {
          if (error?.name === 'AbortError') break
          item.status = 'error'
          item.error = error?.message || '未知错误'
          if (error?.status === 403) {
            setMessage('上游返回 HTTP 403，已停止剩余任务；请检查 LTX 页面登录状态或站点策略。', 'error')
            for (const pending of results.slice(index + 1)) pending.status = 'stopped'
            break
          }
          if (error?.status === 429) {
            setMessage('上游持续返回 HTTP 429，已停止剩余任务；请等待一段时间后再试。', 'warn')
            for (const pending of results.slice(index + 1)) pending.status = 'stopped'
            break
          }
        }
        renderRows()
        if (index < results.length - 1 && !signal.aborted) await sleep(REQUEST_GAP_MS, signal)
      }
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage(error?.message || '批量检测中断。', 'error')
    } finally {
      const stopped = signal.aborted
      if (stopped) for (const item of results) if (item.status === 'queued' || item.status === 'checking') item.status = 'stopped'
      activeController = null
      setRunning(false)
      renderRows()
      if (stopped) setMessage('已停止检测；尚未完成的番号没有被判定为不存在。', 'warn')
      else if (!message.classList.contains('error') && !message.classList.contains('warn')) setMessage('批量检测完成。存在、不存在与失败结果已分别统计。')
    }
  }

  startButton.addEventListener('click', runBatch)
  cancelButton.addEventListener('click', () => activeController?.abort())
  $('.minimize').addEventListener('click', () => { panel.hidden = true; launcher.hidden = false })
  launcher.addEventListener('click', () => { launcher.hidden = true; panel.hidden = false })
  $('.clear').addEventListener('click', () => {
    if (running) return
    input.value = ''
    results = []
    renderRows()
    setMessage('已清空。')
  })
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(results.map(item =>
        item.code + '\t' + statusLabel(item.status) + (item.error ? '\t' + item.error : ''),
      ).join('\n'))
      setMessage('结果已复制到剪贴板。')
    } catch { setMessage('复制失败，请检查浏览器剪贴板权限。', 'warn') }
  })
  exportButton.addEventListener('click', () => {
    const blob = new Blob(['\uFEFF' + exportText()], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'ltx-code-check-' + new Date().toISOString().slice(0, 10) + '.csv'
    link.click()
    URL.revokeObjectURL(url)
  })

  function mount() {
    if (!document.documentElement || host.isConnected) return
    document.documentElement.append(host)
  }
  mount()
  if (!host.isConnected) {
    const observer = new MutationObserver(() => {
      mount()
      if (host.isConnected) observer.disconnect()
    })
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }
})()
