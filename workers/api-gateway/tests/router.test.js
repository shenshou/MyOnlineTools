import test from 'node:test'
import assert from 'node:assert/strict'
import { getRoute } from '../router.js'
import { hasOnlyAllowedQueryParams, isValidHeaderValue } from '../security.js'
import { isAllowedOrigin } from '../cors.js'

test('JavDB search and review routes are explicitly matched', () => {
  assert.equal(getRoute('/api/javdb/v2/search', 'GET')?.service, 'javdb')
  assert.equal(getRoute('/api/javdb/v1/movies/abc123/reviews', 'GET')?.service, 'javdb')
  assert.equal(getRoute('/api/javdb/v1/movies/abc123/reviews', 'POST'), null)
  assert.equal(getRoute('/api/javdb/v1/movies/a%2Fb/reviews', 'GET'), null)
})

test('LTX only exposes the two fixed POST endpoints', () => {
  assert.equal(getRoute('/api/ltx/api/crypto/session', 'POST')?.service, 'ltx')
  assert.equal(getRoute('/api/ltx/api/items/query', 'POST')?.service, 'ltx')
  assert.equal(getRoute('/api/ltx/api/other', 'POST'), null)
  assert.equal(getRoute('/api/ltx/api/items/query', 'GET'), null)
})

test('query parameters and forwarded header values are constrained', () => {
  const url = new URL('https://gateway.invalid/api/javdb/v2/search?q=ABC&page=1')
  assert.equal(hasOnlyAllowedQueryParams(url, ['q', 'page']), true)
  url.searchParams.set('target', 'https://attacker.invalid')
  assert.equal(hasOnlyAllowedQueryParams(url, ['q', 'page']), false)
  assert.equal(isValidHeaderValue('signature-value'), true)
  assert.equal(isValidHeaderValue('bad' + String.fromCharCode(13, 10) + 'value'), false)
})

test('Origin matching is exact', () => {
  const allowed = ['https://shenshou.github.io']
  assert.equal(isAllowedOrigin('https://shenshou.github.io', allowed), true)
  assert.equal(isAllowedOrigin('https://evil.example', allowed), false)
})
