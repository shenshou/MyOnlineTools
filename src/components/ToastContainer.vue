<script setup>
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'

const { toasts, dismissToast } = useToast()
const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
}
</script>

<template>
  <div class="toast-container" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast-item" :class="`toast-${toast.type}`" role="status">
        <component :is="icons[toast.type] || icons.info" :size="18" class="toast-icon" />
        <span class="toast-message">{{ toast.message }}</span>
        <button class="toast-close" aria-label="关闭提示" @click="dismissToast(toast.id)"><X :size="15" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container{position:fixed;z-index:100;top:88px;right:24px;display:grid;gap:10px;width:min(360px,calc(100vw - 32px));pointer-events:none}
.toast-item{display:flex;align-items:center;gap:11px;padding:13px 14px;background:var(--surface);border:1px solid var(--line);border-radius:11px;box-shadow:0 10px 32px rgba(20,24,45,.14);color:var(--text);font-size:12px;line-height:1.55;pointer-events:auto}
.toast-icon{flex-shrink:0}
.toast-success .toast-icon{color:#2eaa78}.toast-warning .toast-icon{color:#d99a32}.toast-error .toast-icon{color:#dc5b64}.toast-info .toast-icon{color:var(--primary)}
.toast-message{min-width:0;flex:1}
.toast-close{display:grid;place-items:center;flex-shrink:0;border:0;background:transparent;color:var(--muted);padding:4px;border-radius:5px}
.toast-close:hover{background:var(--surface-2);color:var(--text)}
.toast-enter-active,.toast-leave-active,.toast-move{transition:all .2s ease}
.toast-enter-from,.toast-leave-to{opacity:0;transform:translateY(-8px)}
.toast-leave-active{position:absolute;right:0;left:0}
@media(max-width:650px){.toast-container{top:80px;right:12px;width:calc(100vw - 24px)}}
</style>
