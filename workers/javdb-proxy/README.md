# JavDB API proxy (experimental)

This Worker is an optional proxy for the isolated JavDB API lab. It only forwards:

- `GET /api/v2/search`
- `GET /api/v1/movies/:id/reviews`

It does not forward browser cookies, Authorization headers, or account credentials. It accepts a per-request `x-jd-signature` from the lab and forwards it upstream as `jdsignature`. The Worker also attempts to use the User-Agent observed in the JAV-JHS search request. The upstream host is selected by the Worker and cannot be supplied by callers.

## Deploy

1. Install Wrangler and authenticate with your own Cloudflare account.
2. From this directory, run `npx wrangler deploy`.
3. Copy the deployed Worker URL, for example `https://myonlinetools-javdb-proxy.<account>.workers.dev`.
4. Add a repository Actions/Pages build environment variable named `VITE_JAVDB_PROXY_URL` with the value `https://...workers.dev/api`, then rebuild and deploy the Pages site.

For a local Vite build, put the same variable in an untracked `.env.local` file.

## Security and limitations

- The Worker restricts browser Origins to `https://shenshou.github.io` by default. This is a browser-side access restriction, not strong authentication; non-browser clients can spoof the Origin header.
- Only the two fixed API path patterns above are forwarded. The Worker is not a general-purpose open proxy.
- No JavDB login Cookie or JWT is accepted or forwarded.
- The signature algorithm material currently used by the frontend is public client-side code; this proxy does not make it a secret.
- The upstream may still reject the request. In particular, matching the observed User-Agent and query parameters does not prove that the upstream will accept the signature.
- The Worker is source-only until deployed to a Cloudflare account. Do not set `VITE_JAVDB_PROXY_URL` until deployment is complete.
