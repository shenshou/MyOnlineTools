# MyOnlineTools API Gateway

A single, service-aware Cloudflare Worker for explicitly allowlisted upstream APIs.

## Current status

This directory is an isolated LTX integration foundation. It is not deployed, and the frontend does not call it. The existing JavDB review/search request path is intentionally out of scope and remains unchanged.

## Routes

| Gateway route | Method | Fixed upstream |
| --- | --- | --- |
| `/api/ltx/api/crypto/session` | POST | `https://ltxlib.dpdns.org/api/crypto/session` |
| `/api/ltx/api/items/query` | POST | `https://ltxlib.dpdns.org/api/items/query` |

JavDB is deliberately not registered in this Gateway. Its current frontend integration already works directly and does not need migration. The legacy `workers/javdb-proxy` directory is also left untouched in this change.

The caller cannot provide or override an upstream host. Every route has a fixed upstream origin, method, path matcher, query allowlist, header allowlist, and JSON body limit/schema.

## Security boundaries

- Browser Origins are allowlisted by `ALLOWED_ORIGINS` (comma-separated). Origin checks are CORS controls, not authentication.
- Cookies, Authorization, Referer, and arbitrary incoming headers are never forwarded.
- LTX ECDH/HKDF/AES-GCM session negotiation and response decryption remain in the browser. This Worker only forwards the two fixed JSON endpoints.
- LTX session requests are intentionally sent upstream without browser cookies. This must be verified against the public anonymous flow before the frontend is migrated.
- Upstream redirects are blocked; response headers are allowlisted; responses are not cached.
- Request bodies, cookies, session identifiers, and response payloads are not logged.
- The Worker is publicly reachable. Origin allowlisting is not protection against non-browser clients; deploy-level rate limiting and abuse monitoring should be configured before production use.

## Local checks

Run the built-in Node tests from the repository root:

```sh
node --test workers/api-gateway/tests/*.test.js
```

## Deployment

Do not deploy or configure the frontend yet. First verify the LTX anonymous session flow and encrypted query compatibility through the Gateway. Only after those checks pass should the Worker be deployed and the LTX frontend be migrated in a separate change.
