import { getRoute } from './router.js'
import { createCorsHeaders, isAllowedOrigin } from './cors.js'
import { proxyRequest } from './proxy.js'
import { jsonError } from './security.js'

const DEFAULT_ALLOWED_ORIGINS = ['https://shenshou.github.io']

function getAllowedOrigins(env) {
  const configured = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN
  if (!configured) return DEFAULT_ALLOWED_ORIGINS
  return configured.split(',').map(value => value.trim()).filter(Boolean)
}

export default {
  async fetch(request, env = {}) {
    const requestUrl = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowedOrigins = getAllowedOrigins(env)

    if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
      return jsonError('ORIGIN_NOT_ALLOWED', 'Origin not allowed', 403)
    }

    const requestedMethod = request.method === 'OPTIONS'
      ? request.headers.get('Access-Control-Request-Method') || ''
      : request.method
    const route = getRoute(requestUrl.pathname, requestedMethod)

    if (!route) {
      const cors = createCorsHeaders(origin, allowedOrigins)
      return jsonError('ROUTE_NOT_FOUND', 'API route not found', 404, cors)
    }

    const cors = createCorsHeaders(origin, allowedOrigins, route)

    if (request.method === 'OPTIONS') {
      const requestedHeaders = (request.headers.get('Access-Control-Request-Headers') || '')
        .split(',')
        .map(value => value.trim().toLowerCase())
        .filter(Boolean)
      const allowedHeaders = route.allowedHeaders.map(value => value.toLowerCase())
      if (requestedHeaders.some(header => !allowedHeaders.includes(header))) {
        return jsonError('HEADER_NOT_ALLOWED', 'Requested header is not allowed', 403, cors)
      }
      return new Response(null, { status: 204, headers: cors })
    }

    if (!['GET', 'POST'].includes(request.method)) {
      return jsonError('METHOD_NOT_ALLOWED', 'Method not allowed', 405, cors)
    }

    return proxyRequest(request, route, env, cors)
  },
}
