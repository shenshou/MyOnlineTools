import { ref } from 'vue'

const toasts = ref([])
let nextId = 0
const timers = new Map()

function dismissToast(id) {
  const timer = timers.get(id)
  if (timer) window.clearTimeout(timer)
  timers.delete(id)
  toasts.value = toasts.value.filter(item => item.id !== id)
}

function showToast(message, type = 'info', duration = 3000) {
  const id = ++nextId
  toasts.value.push({ id, message: String(message), type })
  if (duration > 0) {
    timers.set(id, window.setTimeout(() => dismissToast(id), duration))
  }
  return id
}

function useToast() {
  return { toasts, showToast, dismissToast }
}

export { useToast }
