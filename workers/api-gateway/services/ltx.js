const UPSTREAM_ORIGIN = 'https://ltxlib.dpdns.org'

export const ltxRoutes = [
  {
    service: 'ltx',
    match: /^\\/api\\/ltx\\/api\\/crypto\\/session$/,
    methods: ['POST'],
    upstreamOrigin: UPSTREAM_ORIGIN,
    upstreamPath: () => '/api/crypto/session',
    allowedQueryParams: [],
    allowedHeaders: ['content-type'],
    forwardHeaders: [],
    body: {
      maxBytes: 2048,
      validate: value =>
        value.v === 1 &&
        typeof value.publicKey === 'string' &&
        /^[A-Za-z0-9_-]{80,100}$/.test(value.publicKey) &&
        Object.keys(value).every(key => ['v', 'publicKey'].includes(key)),
    },
    maxTimeoutMs: 10000,
  },
  {
    service: 'ltx',
    match: /^\\/api\\/ltx\\/api\\/items\\/query$/,
    methods: ['POST'],
    upstreamOrigin: UPSTREAM_ORIGIN,
    upstreamPath: () => '/api/items/query',
    allowedQueryParams: [],
    allowedHeaders: ['content-type', 'x-ltx-session', 'x-ltx-request'],
    forwardHeaders: ['x-ltx-session', 'x-ltx-request'],
    headerLimits: { 'x-ltx-session': 128, 'x-ltx-request': 128 },
    validate: request =>
      /^[A-Za-z0-9_-]{1,128}$/.test(request.headers.get('x-ltx-session') || '') &&
      /^[A-Za-z0-9_-]{16,64}$/.test(request.headers.get('x-ltx-request') || ''),
    body: {
      maxBytes: 16384,
      validate: value => {
        const allowed = ['q', 'actor', 'status', 'genres', 'maker', 'type', 'sub', 'sort', 'randomSeed', 'limit', 'metadata', 'offset']
        return typeof value.q === 'string' &&
          value.q.length > 0 &&
          value.q.length <= 64 &&
          Object.keys(value).every(key => allowed.includes(key))
      },
    },
    maxTimeoutMs: 15000,
  },
]
