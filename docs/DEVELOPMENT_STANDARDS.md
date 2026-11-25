# Development and CI Standards

This document defines the day-to-day development, validation, commit, and CI execution practices for MyOnlineTools. It complements [Architecture](ARCHITECTURE.md), [Security](SECURITY.md), and [Performance](PERFORMANCE.md); it does not replace their technical details.

## 1. Development units and change batching

- Organize work around a coherent feature, bug fix, refactor, or maintenance task—not around individual files or tiny edits.
- Keep each change set cohesive and reviewable. Do not combine unrelated changes merely to reduce the number of CI runs.
- Make small local edits and validate them locally where practical. Avoid pushing every intermediate edit when several edits are part of the same unfinished change.
- Push at meaningful checkpoints, preferably when a coherent change unit is ready for review or integration.
- Do not defer important fixes or necessary collaboration just to reduce CI usage. Batching is a way to avoid redundant runs, not a reason to create oversized or risky changes.

## 2. Local validation before pushing

Run the checks relevant to the changed code before pushing:

- Unit/component logic: `npm test`.
- Production compatibility and integration: `npm run build`.
- Bundle-related changes: `npm run check:bundle`.
- Design-token or styling changes: `npm run check:tokens`.
- Critical browser interactions or end-to-end flows: `npm run test:e2e` (install Playwright Chromium when needed).

The local check set should match the change's risk and scope. Do not run every expensive check mechanically for an unrelated documentation-only or data-only change.

## 3. CI trigger and execution principles

The GitHub Actions workflows use path filters and job-level conditions to select work:

- `.github/workflows/deploy.yml`: pull requests targeting `main` and pushes to `main` are filtered by changed paths; manual runs are also supported. A matching event can start the workflow, but the `changes` job decides which validation groups are needed.
- Unit tests, E2E, design-token checks, and bundle-budget checks run only when their corresponding change filters match (or when the workflow is manually dispatched).
- The production build runs when the site/build filter requires it. A successful non-PR build can proceed to GitHub Pages deployment; pull-request runs validate but do not deploy.
- Changes limited to `public/data/navigation.json` are intentionally excluded from the Pages workflow because the navigation page reads that data directly from GitHub.
- `.github/workflows/security-audit.yml` handles dependency-related changes, its scheduled audit, and manual runs.
- `.github/workflows/performance.yml` runs the Lighthouse audit monthly and supports manual dispatch. It is independent of routine Pages deployment.

The workflow files are the source of truth for exact path filters, schedules, job conditions, and permissions. When changing CI behavior, update this document if the operational rules change.

## 4. Avoiding redundant CI runs

- Do not push after every small edit when the edits belong to one unfinished feature or fix.
- Prefer one push for a coherent, reviewable change unit rather than many pushes that each trigger the same workflow.
- When a pull request needs multiple related corrections, group them into a focused update instead of pushing each trivial adjustment separately.
- Preserve path filters and job-level conditions so unrelated changes do not run irrelevant checks.
- Keep concurrency cancellation enabled where configured; it can cancel an older in-progress run in the same concurrency group, but it does not prevent a new run from being created for each matching push or PR update.
- If a run fails, inspect the failing job and logs first. Rerun failed jobs when appropriate; do not rerun successful jobs without a reason. Fix the underlying cause before retrying persistent failures.
- Never weaken or remove a required test solely to reduce CI frequency. Optimize when work is submitted and which relevant jobs run, not the quality bar.

## 5. Pull request and release boundaries

- A pull request should represent a coherent, reviewable change unit and target the intended base branch.
- Confirm the relevant checks pass and review the diff before merging.
- Pull-request validation does not authorize deployment. Pages deployment remains limited to successful eligible runs on the configured non-PR event.
- Do not merge, deploy, delete branches, or perform destructive repository actions without explicit authorization.
- Keep the change scope narrow; documentation-only changes should not alter application behavior or CI configuration unless explicitly required.

## 6. Keeping standards accurate

- Treat the checked-in workflow files as authoritative for actual CI behavior.
- When a workflow's paths, schedules, job conditions, or deployment permissions change, review this document and the README quality/deployment summaries for accuracy.
- Avoid duplicating detailed workflow configuration here; document the stable operating principles and link to the workflow files for implementation details.
