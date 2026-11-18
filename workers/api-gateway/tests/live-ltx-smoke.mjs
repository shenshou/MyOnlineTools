import assert from 'node:assert/strict'
import { webcrypto } from 'node:crypto'

const API_ORIGIN = 'https://ltxlib.dpdns.org'
const CONTEXT = 'ltx-api-response-v1'
const CONTENT_TYPE = 'application/vnd.ltx.encrypted+json'
const crypto = globalThis.crypto || webcrypto
const encoder = new TextEncoder()

function encodeBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64url')
}

function decodeBase64Url(value) {
  assert.match(value, /^[A-Za-z0-9_-]+$/)
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

function responseAad(sid, rid, pathname, status, encoding) {
  return encoder.encode(JSON.stringify([
    CONTEXT, sid, rid, 'POST', pathname, status, encoding,
  ]))
}

async function main() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits'],
  )
  const publicKey = encodeBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)))

  // Deliberately anonymous: no Cookie or Authorization headers are sent.
  const sessionResponse = await fetch(API_ORIGIN + '/api/crypto/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ v: 1, publicKey }),
  })
  assert.equal(sessionResponse.ok, true, `Anonymous session failed: HTTP ${sessionResponse.status} ${(await sessionResponse.text()).slice(0, 200)}`)

  const session = await sessionResponse.json()
  assert.equal(session.v, 1)
  assert.equal(typeof session.sid, 'string')
  assert.ok(session.sid.length > 0)
  assert.ok(Number.isFinite(session.expiresAt) && session.expiresAt > Date.now())
  const serverPublicKey = decodeBase64Url(session.publicKey)
  const salt = decodeBase64Url(session.salt)
  assert.equal(serverPublicKey.length, 65)
  assert.equal(salt.length, 32)

  const importedServerKey = await crypto.subtle.importKey(
    'raw', serverPublicKey, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )
  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: importedServerKey }, keyPair.privateKey, 256,
  )
  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey'])
  const decryptKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: encoder.encode(`${CONTEXT}:${session.sid}`),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )

  const requestId = encodeBase64Url(crypto.getRandomValues(new Uint8Array(16)))
  const queryBody = {
    q: 'LTX-GATEWAY-PROBE-NOT-FOUND',
    actor: null,
    status: 'all',
    genres: [],
    maker: null,
    type: null,
    sub: false,
    sort: { field: 'added', dir: 'desc' },
    randomSeed: null,
    limit: 1,
    metadata: false,
    offset: 0,
  }
  const queryResponse = await fetch(API_ORIGIN + '/api/items/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-LTX-Session': session.sid,
      'X-LTX-Request': requestId,
      Accept: CONTENT_TYPE,
    },
    body: JSON.stringify(queryBody),
  })
  assert.equal(queryResponse.ok, true, `Anonymous query failed: HTTP ${queryResponse.status} ${(await queryResponse.text()).slice(0, 200)}`)
  assert.equal((queryResponse.headers.get('content-type') || '').split(';')[0].toLowerCase(), CONTENT_TYPE)

  const encrypted = await queryResponse.json()
  assert.equal(encrypted.v, 1)
  assert.equal(encrypted.sid, session.sid)
  assert.equal(encrypted.rid, requestId)
  assert.ok(['identity', 'gzip'].includes(encrypted.encoding))
  const iv = decodeBase64Url(encrypted.iv)
  assert.equal(iv.length, 12)

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
      additionalData: responseAad(session.sid, requestId, '/api/items/query', queryResponse.status, encrypted.encoding),
    },
    decryptKey,
    decodeBase64Url(encrypted.body),
  )

  let decoded = plaintext
  if (encrypted.encoding === 'gzip') {
    decoded = await new Response(new Blob([plaintext]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  const result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(decoded))
  assert.ok(result && Array.isArray(result.items), 'Decrypted payload does not contain items[]')
  process.stdout.write('LTX anonymous session + encrypted query + AES-GCM decryption: PASS\\n')
}

main().catch(error => {
  process.stderr.write(`${error.stack || error}\\n`)
  process.exitCode = 1
})
