# UI Components

This directory contains reusable, presentation-focused UI components shared across the application.

## Conventions

- Keep generic UI components here; keep feature-specific components inside their feature module (for example, navigation components stay in `modules/navigation/components`).
- Keep reusable stateful logic in `src/composables` (for example, `useToast.js`); visual components should consume that logic rather than duplicate it.
- Use the shared design tokens in `src/styles/tokens.css` for colors, typography, spacing, radius, shadows, focus, and layering. Tokens are theme-aware; avoid hard-coded palette values in new components.
- Keep global layout and feature styles in `src/style.css`; keep design primitives and theme values in `src/styles/tokens.css`.
- Do not introduce a third-party UI framework or a second styling system for an individual component.
- Components should expose a small, explicit prop/event API, support keyboard and screen-reader use where applicable, and handle narrow screens.
- Export shared components through `index.js`; import from this entry point in application code.
- Add components when a real use case exists. Avoid placeholder components and speculative abstractions.

## Design tokens

- `src/styles/tokens.css` is the single source of truth for semantic colors and shared visual primitives.
- Dark mode overrides semantic tokens through `:root[data-theme='dark']`; components should not need their own dark-mode palette.
- Existing legacy variables such as `--bg`, `--surface`, `--muted`, `--primary`, and `--shadow` remain available for current styles.

## Current components

- `ToastContainer.vue`: application-level, non-blocking feedback surface. Use `useToast()` from `src/composables/useToast.js` to display and dismiss notifications.

## Planned additions

Add modal, confirmation, form controls, and other primitives incrementally when repeated application needs justify them.
