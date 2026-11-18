# MyOnlineTools API Gateway

A single, service-aware Cloudflare Worker for explicitly allowlisted upstream APIs.

## Current status

This directory is an isolated foundation. It is not deployed, and the frontend does not call it. The existing JavDB review/search request path is unchanged.

## Routes

| Gateway route | Method | Fixed upstream |
| --- | --- | --- |
| `/api/javdb/v2/search` | GET | `https://jdforrepam.com/api/v2/search` |
| `/api/javdb/v1/movies/:id/reviews` | GET | `https://jdforrepam.com/api/v1/movies/:id/reviews` |
| `/api/ltx/api/crypto/session` | POST | `https://ltxlib.dpdns.org/api/crypto/session` |
| `/api/ltx/api/items/query` | POST | `https://ltxlib.dpdns.org/api/items/query` |

The caller cannot provide or override an upstream host. Every route has a fixed upstream origin, method, path matcher, query allowlist, header allowlist, and (where applicable) JSON body limit/schema.

## Security boundaries

- Browser Origins are allowlisted by `ALLOWED_ORIGINS` (comma-separated). Origin checks are CORS controls, not authentication.
- Cookies, Authorization, Referer, and arbitrary incoming headers are never forwarded.
- JavDB's browser header `x-jd-signature` is mapped to the upstream `jdsignature` header.
- LTX ECDH/HKDF/AES-GCM session negotiation and response decryption remain in the browser. This Worker only forwards the two fixed JSON endpoints.
- LTX session requests are intentionally sent upstream without browser cookies. This must be verified against the public anonymous flow before the frontend is migrated.
- Upstream redirects are blocked; response headers are allowlisted; responses are not cached.
- Request bodies, cookies, signatures, session identifiers, and response payloads are not logged.
- The Worker is publicly reachable. Origin allowlisting is not protection against non-browser clients; deploy-level rate limiting and abuse monitoring should be configured before production use.

## Local checks

Run the built-in Node tests from the repository root:

```sh
node --test workers/api-gateway/tests/*.test.js
```

## Deployment

Do not deploy or configure the frontend yet. After the route tests and live upstream compatibility checks pass, authenticate Wrangler and deploy from this directory:

```sh
npx wrangler deploy
```

Then set the frontend gateway URL only in a separate migration change. Keep `workers/javdb-proxy` until the new gateway has passed the JavDB compatibility checks and the live site has been verified.
