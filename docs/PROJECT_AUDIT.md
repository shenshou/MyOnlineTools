# Project maturity audit

**Audit updated:** 2026-11-12  
**Scope:** data integrity, security boundaries, architecture, shared UI, automated quality gates, performance, and release process.  
**Current branch:** `main`  
**Validation dashboard:** [GitHub Actions](https://github.com/shenshou/MyOnlineTools/actions)

## Executive summary

MyOnlineTools has completed the core implementation of its eight-stage maturity plan, excluding accessibility work by explicit project decision. The project now has modular navigation data, administrator, editor, and persistence workflows; validated optimistic concurrency; conflict export/reload/reapply recovery; a reusable UI component library; theme-aware design tokens with a CI regression check; unit and browser tests; dependency and bundle audits; mobile Lighthouse reporting; and automated GitHub Pages deployment.

The remaining work is primarily final acceptance, periodic performance observation, and small maintenance improvements—not foundational project architecture.

## Current quality baseline

| Area | Current baseline |
| --- | --- |
| Vitest | 63 tests across 10 files |
| Playwright E2E | 9 browser tests |
| Dependency audit | `npm audit --audit-level=moderate` passes |
| Design token guard | Passes; no raw hex/RGB or named black/white values outside token definitions |
| Production JavaScript | 80.6 KB gzip, 8 chunks |
| Largest JavaScript chunk | 51.6 KB gzip |
| Production CSS | 10.9 KB gzip |
| Lighthouse mobile Performance | 99/100 |
| FCP / LCP | 1,464 ms / 1,657 ms |
| TBT / CLS | 22 ms / 0.000 |
| GitHub Pages deployment | Successful for the latest fully validated code snapshot |

Lighthouse results are lab measurements from GitHub-hosted runners. They are useful for regression comparison, not a guarantee of real-user Core Web Vitals.

## Findings and status

| ID | Priority | Finding | Status |
| --- | --- | --- | --- |
| AUD-01 | High | A stale tab could overwrite a newer navigation document. | **Resolved:** remote JSON is compared with the loaded baseline; writes use the same response's file SHA. |
| AUD-02 | High | Malformed or oversized navigation input could reach persistence. | **Resolved:** schema validation at import/save boundaries and 5 MiB UTF-8 limit; oversized files are rejected before FileReader. |
| AUD-03 | High | Concurrent writes could silently lose staged edits. | **Resolved:** baseline and write-time conflicts are distinguished; staged data can be exported, reloaded, reapplied, and saved. |
| AUD-04 | High | GitHub persistence and failure cases had limited automated coverage. | **Resolved:** tests cover authorization, invalid payloads, stale baselines, UTF-8 writes, write conflicts, server failures, token expiry, rate limits, and network failures. |
| AUD-05 | Medium | Website/category editing and import orchestration were coupled to the view. | **Resolved:** CRUD/import orchestration moved to `useNavigationEditor.js`; pure validation and transformations remain in focused modules. |
| AUD-06 | Medium | Navigation loading/cache/baseline state was coupled to the view. | **Resolved:** extracted to `useNavigationData.js` with valid-cache fallback and tests. |
| AUD-07 | Medium | CI used broad permissions and lockfile synchronization. | **Resolved:** `npm ci`; build job is read-only and deploy job receives only Pages/id-token permissions. |
| AUD-08 | Medium | Bundle growth had no guard. | **Resolved:** CI enforces 200 KB total JS gzip, 100 KB largest JS chunk, and 40 KB CSS gzip budgets. |
| AUD-09 | Medium | Browser performance had no repeatable baseline. | **Resolved:** mobile Lighthouse Performance audit runs in CI and uploads its JSON report. |
| AUD-10 | Low | Raw colors were scattered across page and component styles. | **Resolved:** semantic, hero, and tool-category palettes are tokens; CI blocks raw color literals outside the token file. |
| AUD-11 | Low | Navigation view had too much orchestration logic. | **Improved:** `NavigationView.vue` reduced from 367 to 262 lines; remaining content is mostly page template and scoped presentation. |
| AUD-12 | Low | GitHub API errors were too generic for recovery. | **Resolved:** token, permission, rate-limit, missing-resource, server, and network errors have distinct user-facing messages; no blind write retries. |
| AUD-13 | Low | CSS spacing values were repeated as literals. | **Partially resolved:** common layout gaps and padding now use the spacing scale; one-off layout values remain intentionally local. |
| AUD-14 | Low | Accessibility had not received a complete audit. | **Deferred by project decision:** no accessibility audit, screen-reader validation, or dedicated remediation in this phase. |

## Current architecture

```text
Vue 3 + Vite + Vue Router (Hash) + Pinia
├── App.vue                         application shell and global search
├── views/                          lazy-loaded page templates
├── components/ui/                  shared UI primitives
├── composables/                    toast and confirmation state
├── modules/navigation/
│   ├── useNavigationData.js        remote load, baseline, session cache
│   ├── useNavigationAdmin.js       administrator session lifecycle
│   ├── useNavigationEditor.js      website/category CRUD and import workflow
│   ├── useNavigationPersistence.js validated save and conflict recovery
│   ├── useNavigationFilters.js     filtering and sorting
│   ├── editor.js                   pure editor transformations
│   ├── operations.js               import merge/deduplication
│   ├── validation.js               schema, URL, and size validation
│   └── github.js                   token session and GitHub Contents API
├── workers/                        isolated regex processing
├── styles/tokens.css               theme-aware design tokens
└── scripts/                        bundle and token regression checks
```

## Eight-stage execution record

1. **Quality audit:** project risks and current baseline documented.
2. **Security and data reliability:** token boundary, schema/URL validation, UTF-8 size limits, stale-write protection, and conflict recovery implemented.
3. **Automated testing:** 63 Vitest tests and 9 Playwright E2E tests run in CI before deployment.
4. **Architecture:** navigation data, admin, editor, persistence, filters, and pure transformations separated into focused modules.
5. **UX/UI:** shared component library established; semantic and brand tokens migrated; raw-color regression check added.
6. **Performance:** route splitting and worker execution retained; bundle budgets and mobile Lighthouse baseline run in CI.
7. **Engineering/release:** locked dependencies, least-privilege jobs, dependency audit, E2E, token guard, Lighthouse artifact, and Pages deployment.
8. **Documentation:** README, architecture, security, performance, and maturity audit maintained.

Accessibility is excluded from this execution scope and remains deferred.

## Remaining work

### Final acceptance / ongoing maintenance

- Complete a final production deployment verification for the latest commit and confirm the public Pages site loads.
- Perform a short manual smoke check on desktop and mobile layouts; this is a visual/product check, not an accessibility audit.
- Observe Lighthouse metrics across several future deployments before considering a score-based CI threshold.
- Continue replacing repeated spacing values when touching related styles; avoid broad mechanical CSS rewrites.

### Deferred

- Full accessibility audit, screen-reader testing, and dedicated accessibility remediation.
- Manual cross-browser and assistive-technology validation.

## Validation limits

Passing CI proves that the checked-in tests, dependency audit, production build, bundle budget, token guard, Lighthouse collection, and deployment succeeded for a specific source snapshot. It does not prove absence of all vulnerabilities, replace manual product testing, or guarantee identical field performance across devices and networks.
