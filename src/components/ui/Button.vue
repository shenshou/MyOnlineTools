<script setup>
defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  disabled: Boolean,
  loading: Boolean,
  block: Boolean,
})
defineEmits(['click'])
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[variant, size, { block, loading }]"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="button-spinner" aria-hidden="true"></span>
    <slot />
  </button>
</template>

<style scoped>
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--line); border-radius: var(--radius-md); padding: 8px 13px; font: inherit; font-size: 12px; font-weight: 600; line-height: 1.4; transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), box-shadow var(--transition-fast); }
.btn:focus-visible { outline: 0; box-shadow: var(--focus-ring); }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.sm { padding: 5px 9px; font-size: 11px; }
.lg { padding: 11px 16px; font-size: 13px; }
.primary { background: var(--primary); color: var(--on-primary); border-color: var(--primary); }
.primary:hover:not(:disabled) { background: var(--primary-dark); border-color: var(--primary-dark); }
.secondary { background: var(--surface); color: var(--text); }
.secondary:hover:not(:disabled) { background: var(--surface-hover); }
.ghost { background: transparent; color: var(--text-secondary); border-color: transparent; }
.ghost:hover:not(:disabled) { background: var(--surface-hover); color: var(--text); }
.danger { background: var(--danger); color: var(--on-primary); border-color: var(--danger); }
.danger:hover:not(:disabled) { filter: brightness(.94); }
.block { width: 100%; }
.loading { cursor: wait; }
.button-spinner { width: 12px; height: 12px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: button-spin .7s linear infinite; }
@keyframes button-spin { to { transform: rotate(360deg); } }
</style>