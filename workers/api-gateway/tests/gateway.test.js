import test from 'node:test'
import assert from 'node:assert/strict'
import worker from '../index.js'

const ORIGINAL_FETCH = globalThis.fetch

test('JavDB gateway maps the signature and never forwards browser cookies', async () => {
  let captured
  globalThis.fetch = async (url, init) => {
    captured = { url: String(url), init }
    return new Response(JSON.stringify({ success: 1, data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const request = new Request(
      'https://gateway.example/api/javdb/v1/movies/abc123/reviews?page=2&sort_by=hotly&limit=20',
      {
        method: 'GET',
        headers: {
          Origin: 'https://shenshou.github.io',
          Cookie: 'must-not-forward=1',
          'x-jd-signature': '1780000000.lpw6vgqzsp.signature',
          'accept-language': 'zh-TW',
        },
      },
    )
    const response = await worker.fetch(request, {})
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://shenshou.github.io')
    assert.equal(captured.url, 'https://jdforrepam.com/api/v1/movies/abc123/reviews?page=2&sort_by=hotly&limit=20')
    assert.equal(captured.init.headers.get('jdsignature'), '1780000000.lpw6vgqzsp.signature')
    assert.equal(captured.init.headers.get('Cookie'), null)
    assert.equal(captured.init.headers.get('Authorization'), null)
  } finally {
    globalThis.fetch = ORIGINAL_FETCH
  }
})

test('LTX session request is forwarded to its fixed host without cookies', async () => {
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
    const request = new Request('https://gateway.example/api/ltx/api/crypto/session', {
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

test('unknown upstream routes and unapproved preflight headers are rejected', async () => {
  const unknown = await worker.fetch(new Request('https://gateway.example/api/other/anything', {
    headers: { Origin: 'https://shenshou.github.io' },
  }), {})
  assert.equal(unknown.status, 404)

  const preflight = await worker.fetch(new Request('https://gateway.example/api/javdb/v2/search', {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://shenshou.github.io',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'x-jd-signature, authorization',
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
    const response = await worker.fetch(new Request('https://gateway.example/api/javdb/v2/search', {
      headers: {
        Origin: 'https://attacker.example',
        'x-jd-signature': 'signature',
      },
    }), {})
    assert.equal(response.status, 403)
    assert.equal(called, false)
  } finally {
    globalThis.fetch = ORIGINAL_FETCH
  }
})
