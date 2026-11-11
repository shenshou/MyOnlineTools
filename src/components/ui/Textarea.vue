<script setup>
defineOptions({ inheritAttrs: false })
defineProps({
  modelValue: { type: String, default: '' },
  label: String,
  hint: String,
  error: String,
  placeholder: String,
  rows: { type: [String, Number], default: 3 },
  disabled: Boolean,
  required: Boolean,
})
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>
    <textarea
      v-bind="$attrs"
      :value="modelValue"
      :rows="rows"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <small v-if="error" class="field-error">{{ error }}</small>
    <small v-else-if="hint" class="field-hint">{{ hint }}</small>
  </label>
</template>

<style scoped>
.field { display: grid; gap: 6px; min-width: 0; font-size: 11px; color: var(--text-secondary); }
textarea { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--line-strong); border-radius: var(--radius-md); background: var(--surface); color: var(--text); font: inherit; line-height: 1.6; resize: vertical; }
textarea:focus { outline: 0; border-color: var(--primary); box-shadow: var(--focus-ring); }
textarea:disabled { opacity: .6; cursor: not-allowed; }
small { font-size: 10px; color: var(--muted); }
.field-error { color: var(--danger); }
</style>