# Security and data protection

## Security model

MyOnlineTools is a static, browser-side application hosted on GitHub Pages. It has no private application server and does not proxy GitHub API calls.

- Tool input is processed in the browser. Regex matching runs in a dedicated Web Worker with input limits and a timeout.
- Navigation records in `public/data/navigation.json` are public repository content. Do not store passwords, private URLs, access tokens, or other secrets in this file.
- The administrator supplies a GitHub Fine-grained Personal Access Token (PAT). The browser sends it to `api.github.com` in the Authorization header to verify repository access and update the navigation JSON.
- The token is kept in the current tab's `sessionStorage` and in application memory. It is not written into repository files or the navigation dataset.

## Administrator token recommendations

Create a Fine-grained PAT with:

1. Repository access limited to `shenshou/MyOnlineTools`.
2. `Contents: Read and write` permission.
3. An expiration date appropriate to your usage.

Avoid classic PATs and broad account-wide scopes when a repository-scoped token is sufficient. Do not paste a token into chat, issues, commit messages, URLs, or repository files. Use administrator mode only on a device and browser profile you trust.

**Important limitation:** `sessionStorage` limits persistence to the tab's browsing session; it is not a secure vault. Any script executing in the same origin can potentially read it. The application currently relies on Vue's normal text interpolation and does not intentionally render navigation fields as HTML. Do not introduce `v-html` for user-controlled content.

Use the administrator logout control to clear the token from the current tab. If a token may have been exposed, revoke it immediately in GitHub and create a replacement.

## Navigation data integrity

- The public JSON is validated before being loaded into the editor or accepted from an import.
- Before saving, the application compares the latest remote JSON with the baseline loaded by the current page.
- The write then uses GitHub's current file SHA. If another update occurs after the comparison, GitHub rejects the stale SHA rather than accepting a blind overwrite.
- A baseline mismatch cancels the save. Reload the latest data and reapply your intended edits; the application does not automatically merge concurrent changes.
- Export the navigation JSON periodically as an independent backup. Git history also preserves previous versions of the file and can be used to restore it.

## Browser storage

- Administrator token: tab-scoped `sessionStorage`.
- Navigation last-successful-read cache: tab-scoped `sessionStorage`.
- Theme, tool favorites, recent tools, and view preferences: browser `localStorage`.

Storage may be cleared by the user or browser. The application falls back to defaults when preference storage is unavailable or malformed. Local preferences are not synchronized between devices.

## External resources

The application no longer downloads Google Fonts at startup. Website favicon fallback may still request the target website's favicon and Google's favicon service. These requests disclose ordinary network metadata to the relevant services and are not required for the core text-processing tools.

## Reporting and recovery

For a suspected token exposure, revoke the PAT in GitHub first. For accidental navigation data changes, restore the previous `public/data/navigation.json` version from the repository's commit history, or import a previously exported JSON backup and save it.
