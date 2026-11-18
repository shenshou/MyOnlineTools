import { jsonError, hasOnlyAllowedQueryParams, isValidHeaderValue, readJsonBody } from './security.js'

const DEFAULT_TIMEOUT_MS = 15000
const RESPONSE_HEADERS = ['content-type', 'retry-after']

function appendVary(headers, value) {
  const current = headers.get('Vary')
  const values = new Set((current || '').split(',').map(item => item.trim()).filter(Boolean))
  values.add(value)
  headers.set('Vary', [...values].join(', '))
}

export async function proxyRequest(request, route, env, corsHeaders) {
  const incomingUrl = new URL(request.url)
  if (incomingUrl.search.length > (route.maxQueryLength || 2048)) {
    return jsonError('QUERY_TOO_LARGE', 'Query string is too large', 414, corsHeaders)
  }
  if (!hasOnlyAllowedQueryParams(incomingUrl, route.allowedQueryParams)) {
    return jsonError('QUERY_PARAM_NOT_ALLOWED', 'Query parameter is not allowed', 400, corsHeaders)
  }
  if (route.validate && !route.validate(request, incomingUrl)) {
    return jsonError('INVALID_REQUEST', 'Required request fields are missing or invalid', 400, corsHeaders)
  }

  const upstreamUrl = new URL(route.upstreamPath(incomingUrl), route.upstreamOrigin)
  for (const [key, value] of incomingUrl.searchParams) upstreamUrl.searchParams.append(key, value)

  const upstreamHeaders = new Headers()
  for (const name of route.forwardHeaders) {
    const value = request.headers.get(name)
    if (value && isValidHeaderValue(value, route.headerLimits?.[name] || 512)) {
      upstreamHeaders.set(route.headerMap?.[name] || name, value)
    }
  }

  let body
  if (route.body) {
    const parsed = await readJsonBody(request, route.body.maxBytes)
    if (parsed.error) return jsonError('INVALID_REQUEST_BODY', parsed.error, 400, corsHeaders)
    if (!route.body.validate(parsed.value)) {
      return jsonError('INVALID_REQUEST_BODY', 'Request body does not match the route schema', 400, corsHeaders)
    }
    body = JSON.stringify(parsed.value)
    upstreamHeaders.set('Content-Type', 'application/json')
  }

  const timeoutMs = Math.min(
    Math.max(Number(env.GATEWAY_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS, 1000),
    route.maxTimeoutMs || DEFAULT_TIMEOUT_MS,
  )
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort('Gateway upstream timeout'), timeoutMs)

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body,
      redirect: 'manual',
      signal: controller.signal,
    })

    if (upstream.status >= 300 && upstream.status < 400) {
      return jsonError('UPSTREAM_REDIRECT_BLOCKED', 'Upstream redirect was blocked', 502, corsHeaders)
    }

    const responseHeaders = new Headers(corsHeaders)
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    responseHeaders.set('Cache-Control', 'no-store')
    appendVary(responseHeaders, 'Accept-Encoding')

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    })
  } catch (error) {
    const timedOut = controller.signal.aborted
    // Keep logs free of request headers, query values, cookies, and response bodies.
    console.error('API Gateway upstream failure', {
      service: route.service,
      path: incomingUrl.pathname,
      reason: timedOut ? 'timeout' : (error?.name || 'unknown'),
    })
    return jsonError(
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
      timedOut ? 'Upstream request timed out' : 'Upstream request failed',
      502,
      corsHeaders,
    )
  } finally {
    clearTimeout(timeout)
  }
}
