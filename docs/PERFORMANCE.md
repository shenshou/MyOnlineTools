# Performance budgets

The production build is checked in CI after Vite generates `dist/assets`.

| Metric | Budget |
| --- | ---: |
| Total JavaScript, gzip | 200 KB |
| Largest JavaScript chunk, gzip | 100 KB |
| Total CSS, gzip | 40 KB |

The budget script measures the generated production assets with Node's built-in gzip implementation. It does not download dependencies or require a browser.

## Why these limits

- The total JavaScript budget constrains the amount of code a browser may need to download and parse across all routes.
- The per-chunk budget prevents one route or shared dependency chunk from becoming disproportionately large.
- The CSS budget limits the total stylesheet payload while allowing the existing visual system to be migrated incrementally.

## Initial measured baseline

Measured in GitHub Actions on 2026-11-12 (Node 22, Vite production build):

| Metric | Measured | Budget |
| --- | ---: | ---: |
| Total JavaScript, gzip | 79.4 KB | 200 KB |
| Largest JavaScript chunk, gzip | 51.6 KB | 100 KB |
| Total CSS, gzip | 10.3 KB | 40 KB |

The first successful Lighthouse baseline after the overlay-token CSS correction was measured on 2026-11-12:\n\n| Metric | Measured |\n| --- | ---: |\n| Mobile Performance score | 99/100 |\n| First Contentful Paint | 1,471 ms |\n| Largest Contentful Paint | 2,127 ms |\n| Total Blocking Time | 39 ms |\n| Cumulative Layout Shift | 0.000 |\n\nThese are lab measurements from one GitHub-hosted runner, not guarantees of real-user Core Web Vitals.

## Lighthouse performance report

CI runs a mobile Lighthouse audit against the built site served locally by Vite Preview. Only the **Performance** category is collected in this phase; the Accessibility category is intentionally excluded while accessibility work is deferred.

The JSON report is uploaded as the `lighthouse-performance-report` workflow artifact. The CI log prints the performance score, FCP, LCP, TBT, and CLS so later runs can be compared under the same GitHub-hosted runner and simulated mobile throttling profile.

The first successful Lighthouse run establishes the initial browser-performance baseline. Lab scores can vary between runner instances, so use the individual metrics and repeated runs rather than treating a single score as a precise user-experience measurement.

Run locally:

```bash
npm run build
npm run check:bundle
```
