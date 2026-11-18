# MyOnlineTools API Gateway

A single-purpose Cloudflare Worker for the LTX API integration.

## Current status

This directory is an isolated LTX integration foundation. It is not deployed, and the frontend does not call it. The existing JavDB review/search request path is intentionally out of scope and remains unchanged.

**Live browser and upstream validation is currently blocked.**

- The actual GitHub Pages browser Network panel shows the direct `/api/crypto/session` OPTIONS preflight returning HTTP 403. The subsequent fetch is marked CORS error because the browser blocks the POST after the failed preflight. This confirms a preflight failure on the direct browser-to-upstream path; it does not reveal the POST status because the browser never sends that POST.
- Separately, anonymous POST checks from GitHub Actions to `https://ltxlib.dpdns.org/api/crypto/session` returned HTTP 403 with `{"error":"请从网页上操作","reason":"origin"}` both when sent with `Origin: https://shenshou.github.io` and without an Origin header.
- This Worker is designed to answer browser OPTIONS preflight locally with 204 and the configured CORS headers. That can solve the browser-to-Worker preflight layer only. It does **not** establish that the Worker-to-upstream POST will be accepted; the separate Actions POST checks indicate that it may still be rejected.
- The Gateway must not spoof the upstream site's Origin or otherwise evade its origin policy. Do not deploy or migrate the frontend until a legitimate upstream request path is validated.
- A legitimate integration requires the upstream operator to authorize the GitHub Pages origin / Gateway server-to-server requests, or provide an official integration method.

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
- LTX session requests are intentionally sent upstream without browser cookies. This must be verified against an authorized upstream flow before the frontend is migrated.
- Upstream redirects are blocked; response headers are allowlisted; responses are not cached.
- Request bodies, cookies, session identifiers, and response payloads are not logged.
- The Worker is publicly reachable. Origin allowlisting is not protection against non-browser clients; deploy-level rate limiting and abuse monitoring should be configured before production use.

## Local checks

Run the built-in Node tests from the repository root:

```sh
node --test workers/api-gateway/tests/*.test.js
```

## Deployment

Do not deploy or configure the frontend while the upstream origin-policy rejection remains unresolved. After a legitimate upstream integration method is confirmed, repeat the session and encrypted query checks through the Gateway. Only after those checks pass should the Worker be deployed and the LTX frontend be migrated in a separate change.
