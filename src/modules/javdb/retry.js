export const MAX_REQUEST_RETRIES = 3

export const RETRYABLE_HTTP_STATUSES = new Set([403, 408, 425, 429, 500, 502, 503, 504])

export function parseRetryAfter(value, now = Date.now()) {
  if (value == null || value === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1000)
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - now) : null
}

export function isRetryableRequestError(error) {
  if (!error || error.name === 'AbortError') return false
  if (RETRYABLE_HTTP_STATUSES.has(Number(error.status))) return true
  return error.status == null && (error.name === 'TypeError' || error.cause?.name === 'TypeError')
}

export function getRetryDelayMs(error, retryNumber) {
  if (Number.isFinite(error?.retryAfterMs) && error.retryAfterMs >= 0) return error.retryAfterMs
  const attempt = Math.max(1, Number(retryNumber) || 1)
  const baseDelay = Number(error?.status) === 403 ? 30_000 : 10_000
  return baseDelay * (2 ** (attempt - 1))
}
