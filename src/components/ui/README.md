# UI Components

This directory contains reusable, presentation-focused UI components shared across the application.

## Conventions

- Keep generic UI components here; keep feature-specific components inside their feature module (for example, navigation components stay in `modules/navigation/components`).
- Keep reusable stateful logic in `src/composables` (for example, `useToast.js`); visual components should consume that logic rather than duplicate it.
- Prefer the existing visual language and CSS variables in `src/style.css`. Do not introduce a third-party UI framework or a second styling system for an individual component.
- Components should expose a small, explicit prop/event API, support keyboard and screen-reader use where applicable, and handle narrow screens.
- Export shared components through `index.js`; import from this entry point in application code.
- Add components when a real use case exists. Avoid placeholder components and speculative abstractions.

## Current components

- `ToastContainer.vue`: application-level, non-blocking feedback surface. Use `useToast()` from `src/composables/useToast.js` to display and dismiss notifications.

## Planned additions

Add modal, confirmation, form controls, and other primitives incrementally when repeated application needs justify them.
