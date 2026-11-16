const UPSTREAM_ORIGIN = 'https://jdforrepam.com'
const DEFAULT_ALLOWED_ORIGIN = 'https://shenshou.github.io'

function corsHeaders(origin, allowedOrigin) {
  return {
    'access-control-allow-origin': origin === allowedOrigin ? origin : allowedOrigin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'x-jd-signature, accept-language',
    'access-control-max-age': '86400',
    'vary': 'Origin',
  }
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowedOrigin = env.ALLOWED_ORIGIN || DEFAULT_ALLOWED_ORIGIN
    const cors = corsHeaders(origin, allowedOrigin)

    if (origin && origin !== allowedOrigin) {
      return json({ error: 'Origin not allowed' }, 403, cors)
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }
    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed' }, 405, cors)
    }

    const allowedPath =
      url.pathname === '/api/v2/search' ||
      /^\/api\/v1\/movies\/[^/]+\/reviews$/.test(url.pathname)
    if (!allowedPath) {
      return json({ error: 'API path not allowed' }, 404, cors)
    }

    const signature = request.headers.get('x-jd-signature')
    if (!signature) {
      return json({ error: 'Missing x-jd-signature' }, 400, cors)
    }

    const upstreamUrl = new URL(url.pathname + url.search, UPSTREAM_ORIGIN)
    const upstreamHeaders = new Headers({
      accept: 'application/json',
      'accept-language': request.headers.get('accept-language') || 'zh-TW',
      'jdsignature': signature,
      'user-agent': 'Dart/3.5 (dart:io)',
    })

    try {
      const upstream = await fetch(upstreamUrl, {
        method: 'GET',
        headers: upstreamHeaders,
        redirect: 'follow',
      })
      const responseHeaders = new Headers(cors)
      responseHeaders.set('content-type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
      responseHeaders.set('cache-control', 'no-store')
      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders,
      })
    } catch (error) {
      return json({ error: 'Upstream request failed', message: error.message }, 502, cors)
    }
  },
}
