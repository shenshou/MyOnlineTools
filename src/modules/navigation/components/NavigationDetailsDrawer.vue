<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, Pencil, Trash2, X } from 'lucide-vue-next'
import { Button } from '../../../components/ui'
import WebsiteFavicon from './WebsiteFavicon.vue'

const props = defineProps({
  website: { type: Object, required: true },
  categories: { type: Array, default: () => [] },
  admin: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'visit', 'edit', 'delete'])
const panel = ref(null)
let previousFocus = null

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return '' }
}
function focusableElements() {
  return [...(panel.value?.querySelectorAll('a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])]
    .filter(element => element.getClientRects().length > 0)
}
function onKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return
  const elements = focusableElements()
  if (!elements.length) {
    event.preventDefault()
    panel.value?.focus()
    return
  }
  const first = elements[0]
  const last = elements[elements.length - 1]
  const outside = !panel.value?.contains(document.activeElement)
  if (event.shiftKey && (document.activeElement === first || outside)) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && (document.activeElement === last || outside)) {
    event.preventDefault()
    first.focus()
  }
}
onMounted(() => {
  previousFocus = document.activeElement
  window.addEventListener('keydown', onKeydown)
  panel.value?.querySelector('button[aria-label="关闭详情"]')?.focus()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (previousFocus?.isConnected) previousFocus.focus()
})
</script>

<template>
  <div class="details-backdrop" @mousedown.self="emit('close')">
    <aside
      ref="panel"
      class="details-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="website-details-title"
      tabindex="-1"
    >
      <div class="details-head">
        <h2 id="website-details-title">网站详情</h2>
        <Button variant="ghost" size="sm" aria-label="关闭详情" @click="emit('close')"><X :size="18" /></Button>
      </div>
      <div class="details-content">
        <div class="details-brand">
          <WebsiteFavicon :website="website" :size="48" />
          <div>
            <h3>{{ website.name }}</h3>
            <a :href="website.url" target="_blank" rel="noopener noreferrer">{{ domainOf(website.url) }} <ExternalLink :size="12" /></a>
          </div>
        </div>
        <div class="details-actions">
          <Button variant="primary" @click="emit('visit', website)"><ExternalLink :size="15" />访问网站</Button>
          <Button v-if="admin" variant="secondary" @click="emit('edit', website)"><Pencil :size="15" />编辑</Button>
          <Button v-if="admin" variant="danger" aria-label="删除网址" @click="emit('delete', website)"><Trash2 :size="15" /></Button>
        </div>
        <section class="detail-section">
          <h3>简介</h3>
          <p>{{ website.description || '暂无简介' }}</p>
        </section>
        <section class="detail-section">
          <h3>详细备注</h3>
          <p class="detail-notes">{{ website.notes || '暂无详细备注' }}</p>
        </section>
        <section class="detail-section">
          <h3>网址</h3>
          <a :href="website.url" target="_blank" rel="noopener noreferrer">{{ website.url }}</a>
        </section>
        <section class="detail-section">
          <h3>分类与标签</h3>
          <p>{{ categories.find(category => category.id === website.categoryId)?.name || '未分类' }}</p>
          <div class="website-tags"><span v-for="tag in website.tags || []" :key="tag"># {{ tag }}</span></div>
        </section>
        <div class="details-meta">
          <span>创建：{{ new Date(website.createdAt).toLocaleString() }}</span>
          <span>更新：{{ new Date(website.updatedAt).toLocaleString() }}</span>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.details-backdrop { position: fixed; inset: 0; z-index: var(--z-overlay); display: flex; justify-content: flex-end; background: #10132266; }
.details-panel { display: flex; flex-direction: column; width: min(470px, 100%); height: 100%; background: var(--surface); color: var(--text); box-shadow: -10px 0 35px #0002; }
.details-panel:focus { outline: 0; }
.details-head { display: flex; align-items: center; justify-content: space-between; min-height: 58px; padding: 0 20px; border-bottom: 1px solid var(--line); }
.details-head h2 { margin: 0; font-size: 13px; }
.details-content { overflow: auto; padding: 22px; }
.details-brand { display: flex; align-items: center; gap: 13px; margin-bottom: 19px; }
.details-brand h3 { margin: 0 0 5px; font-size: 19px; }
.details-brand a { display: flex; align-items: center; gap: 4px; color: var(--muted); font-size: 10px; }
.details-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 19px; border-bottom: 1px solid var(--line); }
.detail-section { padding: 17px 0; border-bottom: 1px solid var(--line); }
.detail-section h3 { margin: 0; color: var(--muted); font-size: 10px; font-weight: 700; }
.detail-section p, .detail-section > a { display: block; margin: 8px 0 0; overflow-wrap: anywhere; font-size: 12px; line-height: 1.8; }
.detail-section > a { color: var(--primary); }
.detail-notes { white-space: pre-wrap; }
.website-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.website-tags span { padding: 4px 7px; border-radius: 5px; background: var(--surface-2); color: var(--muted); font-size: 10px; }
.details-meta { display: grid; gap: 7px; padding-top: 17px; color: var(--muted); font-size: 9px; }
@media (max-width: 650px) { .details-panel { width: 100%; } }
</style>
