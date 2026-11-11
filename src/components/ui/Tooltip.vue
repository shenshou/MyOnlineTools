<script setup>
defineProps({ text: { type: String, required: true } })
</script>

<template>
  <span class="tip">
    <slot />
    <span class="tooltip-content" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.tip { position: relative; display: inline-flex; }
.tooltip-content { position: absolute; bottom: calc(100% + 7px); left: 50%; z-index: var(--z-dropdown); width: max-content; max-width: 220px; padding: 6px 9px; border-radius: var(--radius-sm); background: var(--text); color: var(--surface); font-size: 10px; line-height: 1.5; opacity: 0; visibility: hidden; transform: translateX(-50%); pointer-events: none; transition: opacity var(--transition-fast); }
.tip:hover .tooltip-content, .tip:focus-within .tooltip-content { opacity: 1; visibility: visible; }
</style>