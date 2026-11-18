# LTX same-origin existence-check bridge

The GitHub Pages page cannot call the LTX API directly because the browser's OPTIONS preflight is rejected. This prototype moves only the network request into a userscript running on the official LTX origin.

## Install once

1. Install a userscript manager such as Tampermonkey.
2. Open the [LTX existence-check bridge userscript](./ltx-existence-bridge.user.js) on GitHub and install it.
3. Keep the userscript enabled for `https://ltxlib.dpdns.org/*`.
4. Open the toolbox's `/ltx-test` page and run a check. The page opens an LTX popup, waits for the helper, and sends the code using `postMessage`.

## Request flow

- The toolbox page opens the official LTX origin from a user-initiated action.
- The helper accepts messages only from `https://shenshou.github.io` and only from `window.opener`.
- Session negotiation and catalogue/search requests use relative same-origin URLs, `credentials: include`, and the official ECDH P-256 / HKDF-SHA256 / AES-256-GCM response protocol.
- The helper checks exact normalized equality against `item.code`.
- The helper sends only `true`, `false`, or an error string to the opener. It does not persist result records or log response bodies.

## Important limitations

- This is a prototype and has not yet been live-verified in a real browser with the userscript manager installed.
- Popup access must be allowed. The LTX page must not sever `window.opener` through a Cross-Origin-Opener-Policy that prevents the bridge.
- This does not bypass the LTX origin policy: it executes requests from the official site origin, in the same way the official frontend does.
- The upstream can still reject requests for other reasons (verification, rate limiting, session expiry, or policy changes).
- The original direct GitHub Pages request and the Cloudflare Gateway are not used by this bridge.
- JavDB code and request paths are untouched.
