export function jsonError(code, message, status, headers = {}) {
  const responseHeaders = new Headers(headers)
  responseHeaders.set('Content-Type', 'application/json; charset=utf-8')
  responseHeaders.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: responseHeaders,
  })
}

export function isValidHeaderValue(value, maxLength = 512) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength &&
    !value.includes(String.fromCharCode(10)) &&
    !value.includes(String.fromCharCode(13))
}

export function hasOnlyAllowedQueryParams(url, allowedParams) {
  for (const key of url.searchParams.keys()) {
    if (!allowedParams.includes(key)) return false
  }
  return true
}

export async function readJsonBody(request, maxBytes) {
  const contentType = (request.headers.get('Content-Type') || '').split(';', 1)[0].trim().toLowerCase()
  if (contentType !== 'application/json') {
    return { error: 'Content-Type must be application/json' }
  }

  const declaredLength = Number(request.headers.get('Content-Length') || 0)
  if (declaredLength > maxBytes) return { error: 'Request body is too large' }

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength > maxBytes) return { error: 'Request body is too large' }

  try {
    const value = JSON.parse(new TextDecoder().decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { error: 'Request body must be a JSON object' }
    }
    return { value, bytes }
  } catch {
    return { error: 'Request body is not valid JSON' }
  }
}
