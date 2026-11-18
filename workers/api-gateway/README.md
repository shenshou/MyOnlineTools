# MyOnlineTools API Gateway

A single-purpose Cloudflare Worker for the LTX API integration.

## Current status

This directory is an isolated LTX integration foundation. It is not deployed, and the frontend does not call it. The existing JavDB review/search request path is intentionally out of scope and remains unchanged.

**Live upstream validation is currently blocked.** An anonymous POST to `https://ltxlib.dpdns.org/api/crypto/session` returns HTTP 403 with `{\"error\":\"请从网页上操作\",\"reason\":\"origin\"}` both when sent with the GitHub Pages Origin and when sent without an Origin header. This is an upstream origin-policy rejection, not a CORS preflight failure. The Gateway must not spoof the upstream site's Origin to evade this check. A legitimate integration requires the upstream operator to authorize `https://shenshou.github.io` (or provide an official server-to-server API/proxy mechanism). Until then, do not deploy or migrate the frontend.

## Routes

| Gateway route | Method | Fixed upstream |
| --- | --- | --- |
| `/api/crypto/session` | POST | `https://ltxlib.dpdns.org/api/crypto/session` |
| `/api/items/query` | POST | `https://ltxlib.dpdns.org/api/items/query` |

The Gateway deliberately preserves the upstream pathnames. LTX binds the response authentication data to the request path; adding a gateway-only path prefix would cause browser-side AES-GCM verification to fail.

JavDB is deliberately not registered in this Gateway. Its current frontend integration already works directly and does not need migration. The legacy `workers/javdb-proxy` directory is left untouched.

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

Do not deploy or configure the frontend while the upstream origin-policy rejection remains unresolved. After the upstream operator authorizes the GitHub Pages origin or provides an official integration method, repeat the anonymous session and encrypted query checks through the Gateway. Only after those checks pass should the Worker be deployed and the LTX frontend be migrated in a separate change.
