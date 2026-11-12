# Architecture and maintenance

## Runtime architecture

```text
main.js
├── Pinia: browser preferences
├── Vue Router (Hash history, lazy-loaded views)
└── App.vue: application shell, global search, theme, shared notifications
    ├── HomeView.vue: tool catalogue
    ├── ToolView.vue: tool input/output
    │   └── utils/toolActions.js
    │       └── workers/regex.worker.js
    └── NavigationView.vue
        ├── modules/navigation/useNavigationFilters.js
        ├── modules/navigation/validation.js
        └── modules/navigation/github.js
            └── GitHub Contents API
                └── public/data/navigation.json
```

## Main module responsibilities

| Module | Responsibility |
| --- | --- |
| `src/data/tools.js` | Tool metadata, categories, descriptions, and tags |
| `src/utils/toolActions.js` | Pure/browser-side tool processing |
| `src/workers/regex.worker.js` | Isolated regex matching with a time limit |
| `src/stores/preferences.js` | Theme, favorites, and recent tools |
| `src/modules/navigation/validation.js` | Navigation JSON schema validation and normalization |
| `src/modules/navigation/useNavigationFilters.js` | Category counts, tags, filtering, and sorting |
| `src/modules/navigation/github.js` | GitHub token session, data reads, stale-write protection |
| `src/components/ui/` | Shared UI primitives |
| `src/composables/` | Cross-page toast and confirmation behavior |

## Navigation save flow

1. Load the public JSON (or authenticated latest content) and normalize it.
2. Keep a snapshot of the loaded document as the page's baseline.
3. Stage edits in page memory; do not write after every form change.
4. On save, fetch the latest remote file and compare it with the baseline.
5. If the remote document differs, cancel and ask the administrator to reload and reapply changes.
6. If it matches, write using the same response's Git blob SHA. A later concurrent update causes GitHub to reject the write.

This is optimistic concurrency control, not an automatic merge system.

## Extending the tool catalogue

1. Add metadata to `src/data/tools.js` with a unique `id`, category, description, icon, color, and tags.
2. Implement the operation in `src/utils/toolActions.js`.
3. Add the appropriate input controls or modes in `src/views/ToolView.vue`.
4. Add or update unit tests in `src/utils/toolActions.test.js`.
5. Run `npm test` and `npm run build`.

For CPU-intensive or potentially unbounded work, prefer a Web Worker with explicit input limits and a timeout.

## Navigation data schema

The canonical data file is `public/data/navigation.json`. It uses `schemaVersion: 1`, a categories array, a websites array, and an `updatedAt` timestamp. Validate any imported document through `normalizeNavigationData`; do not bypass validation in new import paths.

## Automated tests

- Vitest: `npm test` for tool logic, navigation validation, and shared component behavior.
- Playwright: `npm run test:e2e` for browser-level JSON, regex-worker, and navigation smoke flows. Install Chromium first with `npx playwright install chromium`.
- GitHub Actions runs both suites against the production preview before deployment.

## Development commands

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Release and recovery checklist

- Confirm the intended changes are on `main`.
- Confirm the lockfile is synchronized and `npm ci` succeeds.
- Confirm unit/component tests, Playwright E2E tests, dependency audit, and production build pass.
- Confirm the GitHub Pages deployment job succeeds.
- For a bad release, revert the offending commit (or commits) and push to `main`; the normal workflow rebuilds and redeploys the reverted state.
- Before major navigation data changes, export `navigation.json` as a backup.
