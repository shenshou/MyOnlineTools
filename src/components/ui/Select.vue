<script setup>
defineOptions({ inheritAttrs: false })
defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  label: String,
  disabled: Boolean,
})
defineEmits(['update:modelValue'])
const valueOf = option => typeof option === 'object' ? option.value : option
const labelOf = option => typeof option === 'object' ? option.label : option
</script>

<template>
  <label class="field">
    <span v-if="label">{{ label }}</span>
    <select v-bind="$attrs" :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="option in options" :key="valueOf(option)" :value="valueOf(option)">{{ labelOf(option) }}</option>
    </select>
  </label>
</template>

<style scoped>
.field { display: grid; gap: 6px; min-width: 0; font-size: 11px; color: var(--text-secondary); }
select { min-width: 0; padding: 9px 10px; border: 1px solid var(--line-strong); border-radius: var(--radius-md); background: var(--surface); color: var(--text); font: inherit; }
select:focus { outline: 0; border-color: var(--primary); box-shadow: var(--focus-ring); }
select:disabled { opacity: .6; cursor: not-allowed; }
</style>