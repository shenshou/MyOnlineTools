# Project Maturity Audit

**Audit baseline:** `cc88b3fc768b38f8e542debc9a351fb62e37953f` (initial static review)  
**Current implementation reviewed through:** `2ffbdb0de02b0fbd26362aaccc6d6f0ce68c834b` plus the active CI workflow changes.  
**Scope:** repository structure, navigation persistence, tool execution, shared UI, dependency graph, and GitHub Pages pipeline.

## Executive summary

The project now has an initial quality and security foundation: navigation validation and stale-write protection, isolated regex execution, browser-storage recovery, a Vitest suite, component interaction tests, lazy-loaded routes, a committed npm lockfile, and CI dependency auditing. The remaining work is primarily deeper browser E2E coverage, broader accessibility review, and continued decomposition of the large navigation view.

## Findings and status

| ID | Priority | Finding | Status |
| --- | --- | --- | --- |
| AUD-01 | High | A stale tab could overwrite a newer navigation document if it fetched the newest SHA only at save time. | **Resolved:** compare latest remote JSON to the loaded baseline, then write with that same response's SHA. |
| AUD-02 | High | Malformed localStorage JSON could crash preference-store initialization. | **Resolved:** guarded parsing, type validation, and safe writes. |
| AUD-03 | High | Navigation imports had shallow validation. | **Resolved:** centralized schema validation, URL protocol/credential checks, field limits, and uniqueness/reference checks. |
| AUD-04 | Medium | Merge import did not register inserted URLs in its lookup map. | **Resolved:** imported documents are normalized and duplicate URLs rejected; merge lookup is updated as entries are inserted. |
| AUD-05 | Medium | Regex matching ran synchronously on the main thread without input bounds. | **Resolved:** dedicated worker, 200-character pattern limit, 20,000-character input limit, and 500 ms timeout. |
| AUD-06 | Medium | Modal focus handling queried the first document-wide modal. | **Resolved:** each modal owns its panel reference and focus trap. |
| AUD-07 | Medium | Browser storage access was not consistently guarded. | **Resolved:** safe reads/writes for preferences, navigation view preferences, and token session access. |
| AUD-08 | Medium | No committed dependency lockfile; installs were not reproducible. | **Resolved:** package-lock is committed and CI uses `npm ci`; a dedicated job synchronizes the lockfile without running dependency lifecycle scripts. |
| AUD-09 | Medium | No automated tests or CI test gate. | **Partially resolved:** 19 unit/component tests run in CI; browser E2E coverage remains outstanding. |
| AUD-10 | Low | Global CSS still contains legacy literal colors alongside semantic tokens. | **Open:** avoid a risky whole-site CSS rewrite; migrate incrementally. |
| AUD-11 | Low | Global search lacked complete keyboard and ARIA semantics. | **Partially resolved:** combobox/listbox semantics and arrow/Enter interaction added; full screen-reader testing remains outstanding. |
| AUD-12 | Low | Third-party font and favicon requests. | **Partially resolved:** blocking Google Fonts import removed; favicon fallback can still contact Google and destination sites. |

## Architecture baseline

```text
Vue 3 + Vite + Vue Router (Hash) + Pinia
├── App.vue                 application shell, global search, navigation
├── views/                  lazy-loaded page views
├── data/tools.js           tool metadata
├── utils/toolActions.js    tool execution logic
├── workers/                isolated regex execution
├── modules/navigation/
│   ├── github.js           GitHub Contents API and token session
│   ├── validation.js       navigation data validation
│   └── useNavigationFilters.js
├── stores/preferences.js  browser preferences
├── components/ui/          shared UI primitives
└── styles/                 design tokens + global CSS
```

## Eight-stage execution record

1. **Quality audit:** completed; baseline findings recorded.
2. **Security and data reliability:** core storage, import, token access, regex execution, and navigation write protections implemented.
3. **Automated testing:** Vitest unit and component tests wired into CI. Current suite: 19 tests across 3 files. Full browser E2E is still a follow-up.
4. **Architecture and maintainability:** navigation filters extracted; validation and GitHub persistence are separate modules. The main navigation view remains large and should be split incrementally.
5. **UX and accessibility:** modal focus ownership and global search keyboard interaction improved. Full manual screen-reader and cross-browser accessibility checks remain.
6. **Performance:** lazy route loading, system font stack, and worker-based regex processing implemented. No formal Lighthouse/Core Web Vitals baseline has been captured.
7. **Engineering and release:** lockfile, `npm ci`, unit-test gate, dependency audit, build, and Pages deployment pipeline configured.
8. **Documentation and maintenance:** architecture, security, setup, testing, and recovery guidance added.

## Validation limits

CI proves that dependency installation, automated tests, security audit, and production build pass for a commit. It does not replace real browser E2E testing, manual assistive-technology checks, or measured performance testing.
