# UI Components

Shared Vue 3 primitives; no third-party UI framework.
- ToastContainer: global non-blocking notifications via useToast().
- Modal: Teleport dialog with scroll lock, focus restoration, a focus trap covering all common form controls, Escape/overlay dismissal, and slots.
- ConfirmDialog: promise-based global confirmation via useConfirm().confirm(options); resolves false on cancellation.
- Button: primary, secondary, ghost, danger variants and sizes.
- Input: labeled v-model input with hint/error and native input attribute forwarding.
- Textarea: labeled v-model multiline input with hint/error and native textarea attribute forwarding.
- Select: native select supporting primitive or { value, label } options.
- Dropdown: action menu.
- Tooltip: hover/focus hint.
- Tabs: controlled tab switcher with arrow-key, Home, and End navigation.
- EmptyState: empty view with optional action.
- Loading: inline/block loading indicator.

Import from index.js. Shared tokens live in src/styles/tokens.css. Feature-specific UI stays in its feature module.
