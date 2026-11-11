<script setup>
import { watch, nextTick, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: String,
  size: { type: String, default: 'md' },
  closeOnOverlay: { type: Boolean, default: true },
  closeOnEsc: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'close'])
let previousFocus = null
let previousOverflow = ''

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape' && props.closeOnEsc) {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return
  const panel = document.querySelector('[data-modal]')
  if (!panel) return
  const focusable = [...panel.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null)
  if (!focusable.length) {
    event.preventDefault()
    panel.focus()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.modelValue, async open => {
  if (open) {
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeydown)
    await nextTick()
    const panel = document.querySelector('[data-modal]')
    const first = panel?.querySelector('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')
    ;(first || panel)?.focus()
  } else {
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = previousOverflow
    if (previousFocus?.isConnected) previousFocus.focus()
    previousFocus = null
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @mousedown.self="props.closeOnOverlay && close()">
      <section class="panel" :class="size" role="dialog" aria-modal="true" :aria-label="title || '对话框'" data-modal tabindex="-1">
        <header v-if="title || $slots.header">
          <slot name="header"><h2>{{ title }}</h2></slot>
          <button type="button" aria-label="关闭" @click="close">×</button>
        </header>
        <main><slot /></main>
        <footer v-if="$slots.footer"><slot name="footer" :close="close" /></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: var(--z-modal); display: grid; place-items: center; padding: 16px; background: #11182799; }
.panel { width: 100%; max-height: 90vh; overflow: auto; background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); }
.panel:focus { outline: 0; }
.sm { max-width: 380px; }
.md { max-width: 520px; }
.lg { max-width: 720px; }
.xl { max-width: 920px; }
header, footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 15px 20px; border-bottom: 1px solid var(--line); }
header h2 { margin: 0; font-size: 15px; }
header button { border: 0; background: none; color: var(--muted); font-size: 22px; line-height: 1; cursor: pointer; }
main { padding: 20px; }
footer { justify-content: flex-end; border-top: 1px solid var(--line); border-bottom: 0; }
@media (max-width: 600px) { .overlay { padding: 10px; } .panel { max-height: 94vh; } main { padding: 15px; } }
</style>