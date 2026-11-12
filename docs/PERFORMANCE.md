# Performance budgets

The production build is checked in CI after Vite generates `dist/assets`.

| Metric | Budget |
| --- | ---: |
| Total JavaScript, gzip | 450 KB |
| Largest JavaScript chunk, gzip | 300 KB |
| Total CSS, gzip | 120 KB |

The budget script measures the generated production assets with Node's built-in gzip implementation. It does not download dependencies or require a browser.

## Why these limits

- The total JavaScript budget constrains the amount of code a browser may need to download and parse across all routes.
- The per-chunk budget prevents one route or shared dependency chunk from becoming disproportionately large.
- The CSS budget limits the total stylesheet payload while allowing the existing visual system to be migrated incrementally.

These are initial guardrails, not claims about measured Lighthouse scores or real-user Core Web Vitals. A later performance pass should add repeatable browser measurements for LCP, CLS, and INP using a fixed runner and throttling profile. Accessibility scoring is intentionally excluded from that work until the separate accessibility phase is resumed.

Run locally:

```bash
npm run build
npm run check:bundle
```
