# Performance budgets

The production build is checked in CI after Vite generates `dist/assets`.

| Metric | Budget |
| --- | ---: |
| Total JavaScript, gzip | 200 KB |
| Largest JavaScript chunk, gzip | 100 KB |
| Total CSS, gzip | 40 KB |

The budget script measures the generated production assets with Node's built-in gzip implementation. The separate design-token check scans CSS and Vue style blocks. Neither check downloads dependencies or requires a browser.

## Why these limits

- The total JavaScript budget constrains the amount of code a browser may need to download and parse across all routes.
- The per-chunk budget prevents one route or shared dependency chunk from becoming disproportionately large.
- The CSS budget limits the total stylesheet payload while allowing the existing visual system to be migrated incrementally.

## Initial measured baseline

Measured in GitHub Actions on 2026-11-12 (Node 22, Vite production build):

| Metric | Measured | Budget |
| --- | ---: | ---: |
| Total JavaScript, gzip | 80.6 KB | 200 KB |
| Largest JavaScript chunk, gzip | 51.6 KB | 100 KB |
| Total CSS, gzip | 10.9 KB | 40 KB |

The latest measured mobile Lighthouse run after the brand/tool token migration was run on 2026-11-12 (GitHub Actions run 43191218516):

| Metric | Measured |
| --- | ---: |
| Mobile Performance score | 99/100 |
| First Contentful Paint | 1,464 ms |
| Largest Contentful Paint | 1,657 ms |
| Total Blocking Time | 22 ms |
| Cumulative Layout Shift | 0.000 |

These are lab measurements from one GitHub-hosted runner, not guarantees of real-user Core Web Vitals.

## Lighthouse performance report

CI runs a mobile Lighthouse audit against the built site served locally by Vite Preview. Only the **Performance** category is collected in this phase; the Accessibility category is intentionally excluded while accessibility work is deferred.

The JSON report is uploaded as the `lighthouse-performance-report` workflow artifact. The CI log prints the performance score, FCP, LCP, TBT, and CLS so later runs can be compared under the same GitHub-hosted runner and simulated mobile throttling profile.

This run establishes the current comparison baseline. Earlier measurements differed, which is expected for lab runs; compare repeated runs and individual metrics rather than treating one score as a precise user-experience measurement. Lab scores can vary between runner instances, so use the individual metrics and repeated runs rather than treating a single score as a precise user-experience measurement.

Run locally:

```bash
npm run build
npm run check:bundle
```
