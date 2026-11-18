const UPSTREAM_ORIGIN = 'https://jdforrepam.com'

export const javdbRoutes = [
  {
    service: 'javdb',
    match: /^\/api\/javdb\/v2\/search$/,
    methods: ['GET'],
    upstreamOrigin: UPSTREAM_ORIGIN,
    upstreamPath: () => '/api/v2/search',
    allowedQueryParams: [
      'q', 'page', 'type', 'limit', 'movie_type',
      'from_recent', 'movie_filter_by', 'movie_sort_by',
    ],
    allowedHeaders: ['x-jd-signature', 'accept-language'],
    forwardHeaders: ['x-jd-signature', 'accept-language'],
    headerMap: { 'x-jd-signature': 'jdsignature' },
    headerLimits: { 'x-jd-signature': 256, 'accept-language': 64 },
    validate: request => Boolean(request.headers.get('x-jd-signature')),
  },
  {
    service: 'javdb',
    match: /^\/api\/javdb\/v1\/movies\/[A-Za-z0-9_-]+\/reviews$/,
    methods: ['GET'],
    upstreamOrigin: UPSTREAM_ORIGIN,
    upstreamPath: url => url.pathname.replace('/api/javdb/', '/api/'),
    allowedQueryParams: ['page', 'sort_by', 'limit'],
    allowedHeaders: ['x-jd-signature', 'accept-language'],
    forwardHeaders: ['x-jd-signature', 'accept-language'],
    headerMap: { 'x-jd-signature': 'jdsignature' },
    headerLimits: { 'x-jd-signature': 256, 'accept-language': 64 },
    validate: request => Boolean(request.headers.get('x-jd-signature')),
  },
]
