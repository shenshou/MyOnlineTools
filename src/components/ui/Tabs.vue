<script setup>
defineProps({
  modelValue: { type: [String, Number], required: true },
  tabs: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
function moveFocus(event, index, tabs) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0
    : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  emit('update:modelValue', tabs[next].value)
  event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus()
}
</script>

<template>
  <div class="tabs" role="tablist">
    <button
      v-for="(tab, index) in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === tab.value"
      :tabindex="modelValue === tab.value ? 0 : -1"
      :class="{ active: modelValue === tab.value }"
      @click="$emit('update:modelValue', tab.value)"
      @keydown="moveFocus($event, index, tabs)"
    >{{ tab.label }}</button>
  </div>
</template>

<style scoped>
.tabs { display: flex; gap: 4px; padding: 4px; background: var(--surface-2); border-radius: var(--radius-md); }
button { padding: 7px 12px; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--muted); font: inherit; font-size: 12px; cursor: pointer; }
button:hover { color: var(--text); }
button:focus-visible { outline: 0; box-shadow: var(--focus-ring); }
button.active { background: var(--surface); color: var(--primary); box-shadow: var(--shadow-sm); }
</style>