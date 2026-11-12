# Project maturity audit

**Audit updated:** 2026-11-12  
**Reviewed commit:** `f1f929722e74946496a9dacb23bbd3616e481e5c`  
**Validation run:** [GitHub Actions run 43185920056](https://github.com/shenshou/MyOnlineTools/actions/runs/43185920056)  
**Scope:** navigation data security and reliability, shared UI, architecture, automated tests, build pipeline, and performance.

## Executive summary

MyOnlineTools has moved beyond its initial utility-site implementation. The repository now has validated navigation persistence with optimistic concurrency checks, conflict recovery that preserves staged edits, modular navigation data/editor logic, automated unit and browser tests, least-privilege deployment jobs, production bundle budgets, and a repeatable mobile Lighthouse performance report.

Accessibility work is explicitly deferred in the current execution phase. Existing semantic markup and keyboard behaviors are retained, but no new accessibility audit or remediation is claimed here.

## Current quality baseline

| Area | Current baseline |
| --- | --- |
| Vitest | 39 tests across 7 files |
| Playwright E2E | 8 browser tests |
| Dependency audit | `npm audit --audit-level=moderate` passes |
| Production JavaScript | 79.5 KB gzip, 8 chunks |
| Largest JavaScript chunk | 51.6 KB gzip |
| Production CSS | 10.3 KB gzip |
| Lighthouse mobile Performance | 99/100 |
| FCP / LCP | 1,471 ms / 2,127 ms |
| TBT / CLS | 39 ms / 0.000 |
| GitHub Pages deployment | Successful for reviewed commit |

Lighthouse results are lab measurements from a GitHub-hosted runner and should be compared over repeated runs rather than treated as guaranteed field metrics.

## Findings and status

| ID | Priority | Finding | Status |
| --- | --- | --- | --- |
| AUD-01 | High | A stale tab could overwrite a newer navigation document. | **Resolved:** compare remote JSON with the loaded baseline and write using the same response's SHA. |
| AUD-02 | High | Malformed navigation input could bypass page-level checks. | **Resolved:** normalize and validate at import and persistence boundaries; document size is limited to 5 MiB UTF-8. |
| AUD-03 | High | Concurrent writes could silently lose staged edits. | **Resolved:** baseline and write-time conflicts are distinguished; staged data remains in page state and can be exported before reload. |
| AUD-04 | High | GitHub persistence had limited automated failure coverage. | **Improved:** tests cover missing authorization, invalid payloads, stale baseline, successful UTF-8 writes, write conflicts, and server failures without blind retries. |
| AUD-05 | Medium | Website/category editor rules were coupled to the large view component. | **Partially resolved:** pure operations extracted to `editor.js`; view-level orchestration remains to be decomposed. |
| AUD-06 | Medium | Navigation loading/cache/baseline state was coupled to the view. | **Resolved:** extracted to `useNavigationData.js` with remote-load, valid-cache fallback, and failure tests. |
| AUD-07 | Medium | CI had broader write permissions and silently synchronized the lockfile. | **Resolved:** CI now uses `npm ci`; build job is read-only and deploy job receives only Pages/id-token permissions. |
| AUD-08 | Medium | Bundle growth was not guarded. | **Resolved:** CI enforces 200 KB total JS gzip, 100 KB largest JS chunk, and 40 KB CSS gzip budgets. |
| AUD-09 | Medium | Browser performance had no repeatable baseline. | **Resolved:** mobile Lighthouse Performance audit runs in CI and uploads its JSON report. |
| AUD-10 | Low | Design tokens coexisted with legacy literal styles. | **Partially resolved:** semantic overlays, alerts, status colors, and shared surfaces migrated; more legacy styles remain. |
| AUD-11 | Low | The navigation view remains a large file. | **Open:** continue extracting authentication/save orchestration and presentation subcomponents when this reduces coupling. |
| AUD-12 | Low | Accessibility has not received a complete manual audit. | **Deferred by project decision:** do not include accessibility remediation in the current phase. |

## Current architecture

```text
Vue 3 + Vite + Vue Router (Hash) + Pinia
├── App.vue                         application shell and global search
├── views/                          lazy-loaded pages
├── components/ui/                  shared UI primitives
├── composables/                    shared interaction state
├── modules/navigation/
│   ├── useNavigationData.js        remote load, baseline, session cache
│   ├── useNavigationFilters.js     filtering and sorting
│   ├── editor.js                   website/category edit operations
│   ├── operations.js               import merge/deduplication
│   ├── validation.js               schema, URL, and size validation
│   └── github.js                   token session and GitHub Contents API
├── workers/                        isolated regex processing
└── styles/                         semantic design tokens
```

## Eight-stage execution record

1. **Quality audit:** baseline findings documented; automated quality gates expanded.
2. **Security and data reliability:** token boundary documented, navigation validation and size limit enforced, stale writes protected, and conflict recovery added.
3. **Automated testing:** 39 Vitest tests and 8 Playwright E2E tests run before deployment.
4. **Architecture:** navigation editor operations and data-loading state extracted; remaining view orchestration still needs decomposition.
5. **UX/UI:** shared component library established; semantic tokens are being migrated incrementally.
6. **Performance:** route splitting and worker execution retained; bundle budgets and mobile Lighthouse baseline now run in CI.
7. **Engineering/release:** least-privilege build/deploy jobs, lockfile enforcement via `npm ci`, security audit, E2E, performance report, and Pages deployment.
8. **Documentation:** README, architecture, security, performance, and this audit updated.

## Remaining work

### In progress / next

- Extract administrator authentication and GitHub save orchestration from `NavigationView.vue`.
- Add an explicit conflict-recovery workflow test for reloading and reapplying staged edits.
- Continue migrating remaining semantic colors and repeated spacing/radius values to design tokens.
- Review GitHub API error handling and recovery messages against rate-limit, permission, and network failures.
- Continue measuring Lighthouse results over several runs before introducing score-based CI gates.

### Deferred

- Full accessibility audit, screen-reader testing, and dedicated accessibility remediation.
- Manual cross-browser and assistive-technology validation.

## Validation limits

Automated CI demonstrates that the checked-in tests, dependency audit, build, bundle budgets, Lighthouse collection, and deployment pass for a specific commit. It does not prove absence of all application vulnerabilities, replace manual browser testing, or guarantee field performance for every device and network.
