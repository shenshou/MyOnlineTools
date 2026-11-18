export function isAllowedOrigin(origin, allowedOrigins) {
  return allowedOrigins.includes(origin)
}

export function createCorsHeaders(origin, allowedOrigins, route) {
  const headers = new Headers({
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  })

  if (origin && isAllowedOrigin(origin, allowedOrigins)) {
    headers.set('Access-Control-Allow-Origin', origin)
    headers.set('Access-Control-Allow-Methods', route ? route.methods.join(', ') + ', OPTIONS' : 'GET, POST, OPTIONS')
    headers.set('Access-Control-Allow-Headers', route ? route.allowedHeaders.join(', ') : 'Content-Type')
    headers.set('Access-Control-Max-Age', '86400')
  }

  return headers
}
