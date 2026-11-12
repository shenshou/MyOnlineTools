# Project Maturity Audit

**Audit baseline:** `cc88b3fc768b38f8e542debc9a351fb62e37953f`  
**Scope:** repository structure, application flows, navigation data persistence, tool execution, shared UI primitives, and GitHub Pages workflow.  
**Status:** static source review. Runtime/browser behavior and dependency vulnerability status still require automated checks.

## Executive summary

The project has a clear, lightweight Vue 3 architecture and a useful separation between tools, navigation, shared UI, and preferences. The main maturity gap is not feature coverage; it is the absence of repeatable quality gates and a few data-integrity and resilience weaknesses around browser storage and repository writes.

No server-side application or private backend is present. The navigation dataset is intentionally public, while administrative writes use a user-supplied GitHub token from the browser.

## Confirmed findings

| ID | Priority | Area | Finding | Impact |
| --- | --- | --- | --- | --- |
| AUD-01 | High | Navigation persistence | Save reads the current file SHA immediately before writing, but does not compare the fetched remote document with the user's loaded baseline. A stale tab can therefore submit an older full document using the newest SHA and overwrite changes made by another tab before the save began. | Lost updates despite the SHA-based Contents API write. |
| AUD-02 | High | Input resilience | `preferences.js` parses localStorage JSON during store initialization without recovery. Malformed or manually edited storage can throw during app startup. | Application startup failure for affected browser profiles. |
| AUD-03 | High | Import validation | Navigation import checks only the top-level arrays and a few website fields. It does not validate category records, URL protocols, field types, IDs, category references, timestamps, or duplicate IDs/URLs comprehensively. | Malformed data can enter the editor and later break rendering or overwrite the public dataset. |
| AUD-04 | Medium | Navigation import | Merge import builds its URL map once and does not add newly imported records to the map. Duplicate URLs within a single import file can therefore be inserted more than once. | Duplicate navigation entries. |
| AUD-05 | Medium | Tool execution | Regex execution runs synchronously on the main thread with unbounded pattern and input sizes. Pathological regular expressions can block the page. | Browser tab becomes unresponsive until execution returns or the tab is closed. |
| AUD-06 | Medium | Shared Modal | Modal focus handling queries the document-wide first `[data-modal]` element rather than its own panel. Multiple simultaneously mounted dialogs can target the wrong panel; the focusable selector also omits some valid controls such as buttons with certain custom tabindex behavior. | Fragile keyboard and focus behavior as dialogs evolve. |
| AUD-07 | Medium | Browser storage | Navigation view mode/sort and the administrator token access sessionStorage/localStorage without consistently guarding storage access failures. | Restricted browser contexts can fail during module/component initialization or preference updates. |
| AUD-08 | Medium | CI | Workflow installs with `npm install`, while the repository has no package lock file. Dependency resolution is not pinned to a reproducible dependency graph. | Builds may change over time without source changes. |
| AUD-09 | Medium | CI | The only configured project script is build; no unit/component/E2E test or lint script is present. | Regressions can pass CI as long as the bundle compiles. |
| AUD-10 | Low | UI consistency | Global CSS still contains extensive literal colors and legacy styles alongside semantic tokens. | Theme and visual changes require more manual coordination. |
| AUD-11 | Low | Accessibility | The global search result list is rendered as a visual dropdown but does not expose a complete combobox/listbox keyboard interaction model. | Keyboard and assistive-technology navigation is weaker than expected. |
| AUD-12 | Low | External requests | Google Fonts and Google favicon fallback introduce third-party requests. | External dependency, privacy, and availability considerations should be documented and optionally made configurable. |

## Positive findings

- Vue template interpolation is used for user-controlled website names, descriptions, notes, and tool output; no `v-html` usage was found in the reviewed application views.
- Website navigation accepts only HTTP and HTTPS schemes through URL normalization before adding/editing records.
- External website opening uses `noopener,noreferrer`.
- The GitHub Contents API write includes the current blob SHA, so writes racing after the initial SHA read are rejected by GitHub rather than silently accepted.
- The administrator token is stored in sessionStorage rather than committed to the repository or persisted in localStorage. This limits persistence but does not protect it from same-origin script execution.
- Navigation JSON is public by design; the GitHub token is not part of the public JSON dataset.
- The current deployment workflow uses least-privilege job permissions for Pages deployment and serializes deployments with a concurrency group.

## Architecture baseline

```text
Vue 3 + Vite + Vue Router (Hash) + Pinia
├── App.vue                 application shell, global search, navigation
├── views/
│   ├── HomeView.vue        tool catalog
│   ├── ToolView.vue        tool input/output UI
│   └── NavigationView.vue  navigation editor and viewer
├── data/tools.js           tool metadata
├── utils/toolActions.js    tool execution logic
├── modules/navigation/
│   ├── github.js           GitHub Contents API and token session
│   ├── defaultData.js      initial navigation data
│   └── components/         navigation-specific UI
├── stores/preferences.js   favorites, recent tools, theme
├── components/ui/          shared UI primitives
├── composables/            toast and confirmation state
└── styles/                 design tokens + global CSS
```

## Eight-stage execution plan

1. **Quality audit** — establish the baseline and prioritized findings (this document).
2. **Security and data reliability** — validate navigation records/imports, prevent stale-document overwrites, harden browser storage and token handling, and bound risky tool inputs.
3. **Automated testing** — add unit tests for pure tool/data logic and wire tests into CI.
4. **Architecture and maintainability** — split the large navigation view into focused composables/components where doing so reduces coupling without destabilizing behavior.
5. **UX and accessibility** — improve modal focus ownership, global search keyboard semantics, labels, and responsive interaction.
6. **Performance** — inspect bundle output, reduce avoidable external requests, and optimize expensive list/search work where measurements justify it.
7. **Engineering and release** — reproducible dependency installation, CI quality gates, deployment verification, and rollback guidance.
8. **Documentation and maintenance** — keep architecture, security assumptions, admin setup, data schema, and contribution guidance current.

## Validation limits

This audit is based on source inspection at the stated commit. It does not claim browser-based end-to-end verification, cross-browser testing, a completed dependency vulnerability scan, or a performance measurement. Those checks are to be introduced in the later stages.
