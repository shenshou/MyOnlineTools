# UI Components

Shared Vue 3 primitives; no third-party UI framework.
- ToastContainer: global non-blocking notifications via useToast().
- Modal: Teleport dialog with scroll lock, focus restoration, keyboard focus loop, Escape/overlay dismissal, and slots.
- ConfirmDialog: promise-based global confirmation via useConfirm().confirm(options); resolves false on cancellation.
- Button: primary, secondary, ghost, danger variants and sizes.
- Input: labeled v-model input with hint/error.
- Select: native select supporting primitive or { value, label } options.
- Dropdown: action menu.
- Tooltip: hover/focus hint.
- Tabs: controlled tab switcher.
- EmptyState: empty view with optional action.
- Loading: inline/block loading indicator.

Import from index.js. Shared tokens live in src/styles/tokens.css. Feature-specific UI stays in its feature module.
