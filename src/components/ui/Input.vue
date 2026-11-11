<script setup>
defineOptions({ inheritAttrs: false })
defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: String,
  hint: String,
  error: String,
  placeholder: String,
  type: { type: String, default: 'text' },
  disabled: Boolean,
  required: Boolean,
})
defineEmits(['update:modelValue'])
</script>

<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>
    <input
      v-bind="$attrs"
      :type="type"
      :value="modelValue"
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
input { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--line-strong); border-radius: var(--radius-md); background: var(--surface); color: var(--text); outline: 0; font: inherit; }
input:focus { border-color: var(--primary); box-shadow: var(--focus-ring); }
input:disabled { opacity: .6; cursor: not-allowed; }
small { font-size: 10px; color: var(--muted); }
.field-error { color: var(--danger); }
</style>