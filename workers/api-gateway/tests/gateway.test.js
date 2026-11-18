import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../index.js'

const ORIGINAL_FETCH = globalThis.fetch

test('LTX session request is forwarded on the unchanged upstream path without cookies', async () => {
  let captured
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init }
    return new Response(JSON.stringify({ v: 1, sid: 'session-id' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const publicKey = 'A'.repeat(87)
    const request = new Request('https://gateway.example/api/crypto/session', {
      method: 'POST',
      headers: {
        Origin: 'https://shenshou.github.io',
        Cookie: 'must-not-forward=1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ v: 1, publicKey }),
    })
    const response = await worker.fetch(request, {})
    assert.equal(response.status, 200)
    assert.equal(captured.url, 'https://ltxlib.dpdns.org/api/crypto/session')
    assert.equal(captured.init.headers.get('Cookie'), null)
    assert.equal(captured.init.headers.get('Authorization'), null)
    assert.deepEqual(JSON.parse(captured.init.body), { v: 1, publicKey })
  } finally {
    globalThis.fetch = ORIGINAL_FETCH
  }
})

test('LTX query request preserves path and protocol headers without cookies', async () => {
  let captured
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init }
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.ltx.encrypted+json' },
    })
  }

  try {
    const requestId = 'A'.repeat(22)
    const request = new Request('https://gateway.example/api/items/query', {
      method: 'POST',
      headers: {
        Origin: 'https://shenshou.github.io',
        Cookie: 'must-not-forward=1',
        Authorization: 'must-not-forward',
        'Content-Type': 'application/json',
        'X-LTX-Session': 'session_id-123',
        'X-LTX-Request': requestId,
      },
      body: JSON.stringify({
        q: 'TEST-001', actor: null, status: 'all', genres: [], maker: null,
        type: null, sub: false, sort: { field: 'added', dir: 'desc' },
        randomSeed: null, limit: 60, metadata: false, offset: 0,
      }),
    })
    const response = await worker.fetch(request, {})
    assert.equal(response.status, 200)
    assert.equal(captured.url, 'https://ltxlib.dpdns.org/api/items/query')
    assert.equal(captured.init.headers.get('x-ltx-session'), 'session_id-123')
    assert.equal(captured.init.headers.get('x-ltx-request'), requestId)
    assert.equal(captured.init.headers.get('Cookie'), null)
    assert.equal(captured.init.headers.get('Authorization'), null)
    assert.equal(response.headers.get('content-type'), 'application/vnd.ltx.encrypted+json')
  } finally {
    globalThis.fetch = ORIGINAL_FETCH
  }
})

test('unknown routes and unapproved preflight headers are rejected', async () => {
  const unknown = await worker.fetch(new Request('https://gateway.example/api/other/anything', {
    headers: { Origin: 'https://shenshou.github.io' },
  }), {})
  assert.equal(unknown.status, 404)

  const preflight = await worker.fetch(new Request('https://gateway.example/api/items/query', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://shenshou.github.io',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type, authorization',
    },
  }), {})
  assert.equal(preflight.status, 403)
})

test('disallowed browser Origins are rejected before upstream fetch', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    return new Response('{}')
  }

  try {
    const response = await worker.fetch(new Request('https://gateway.example/api/crypto/session', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ v: 1, publicKey: 'A'.repeat(87) }),
    }), {})
    assert.equal(response.status, 403)
    assert.equal(called, false)
  } finally {
    globalThis.fetch = ORIGINAL_FETCH
  }
})
