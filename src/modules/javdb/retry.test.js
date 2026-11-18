import { describe, expect, it } from 'vitest'
import { getRetryDelayMs, isRetryableRequestError, MAX_REQUEST_RETRIES, parseRetryAfter } from './retry'

describe('JavDB request retry policy', () => {
  it('retries temporary HTTP statuses', () => {
    for (const status of [403, 408, 425, 429, 500, 502, 503, 504]) {
      expect(isRetryableRequestError({ status })).toBe(true)
    }
  })

  it('does not retry permanent client errors or aborted requests', () => {
    for (const status of [400, 401, 404, 422]) {
      expect(isRetryableRequestError({ status })).toBe(false)
    }
    expect(isRetryableRequestError({ name: 'AbortError' })).toBe(false)
  })

  it('retries browser network failures', () => {
    expect(isRetryableRequestError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('uses longer exponential backoff for HTTP 403', () => {
    expect(getRetryDelayMs({ status: 403 }, 1)).toBe(30_000)
    expect(getRetryDelayMs({ status: 403 }, 2)).toBe(60_000)
    expect(getRetryDelayMs({ status: 403 }, 3)).toBe(120_000)
  })

  it('uses exponential backoff for other temporary errors', () => {
    expect(getRetryDelayMs({ status: 503 }, 1)).toBe(10_000)
    expect(getRetryDelayMs({ status: 503 }, 2)).toBe(20_000)
    expect(getRetryDelayMs({ status: 503 }, 3)).toBe(40_000)
  })

  it('prefers Retry-After', () => {
    expect(getRetryDelayMs({ status: 429, retryAfterMs: 12_500 }, 1)).toBe(12_500)
    expect(parseRetryAfter('15')).toBe(15_000)
    expect(parseRetryAfter('invalid')).toBeNull()
    expect(MAX_REQUEST_RETRIES).toBe(3)
  })
})
