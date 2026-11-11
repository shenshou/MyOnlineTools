<script setup>
import { computed, ref, watch } from 'vue'
import { Globe } from 'lucide-vue-next'

const props = defineProps({
  website: { type: Object, required: true },
  size: { type: Number, default: 34 },
})

const sourceIndex = ref(0)
const failed = ref(false)

const sources = computed(() => {
  const list = []
  const custom = props.website?.favicon?.trim()
  if (custom) list.push(custom)

  try {
    const parsed = new URL(props.website.url)
    list.push(`${parsed.origin}/favicon.ico`)
    list.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=64`)
  } catch {
    // Invalid URLs are handled by the generic icon fallback.
  }

  return [...new Set(list)]
})

watch(
  () => [props.website?.id, props.website?.url, props.website?.favicon],
  () => {
    sourceIndex.value = 0
    failed.value = false
  },
)

function tryNextSource() {
  if (sourceIndex.value + 1 < sources.value.length) {
    sourceIndex.value += 1
  } else {
    failed.value = true
  }
}
</script>

<template>
  <span
    class="website-favicon-frame"
    :style="{ width: `${size}px`, height: `${size}px` }"
    aria-hidden="true"
  >
    <img
      v-if="sources.length && !failed"
      :src="sources[sourceIndex]"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="tryNextSource"
    />
    <Globe v-else :size="Math.max(16, Math.round(size * 0.55))"/>
  </span>
</template>

<style scoped>
.website-favicon-frame {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 9px;
  background: var(--surface-2);
  color: var(--muted);
}
.website-favicon-frame img {
  display: block;
  width: 100%;
  height: 100%;
  padding: 5px;
  object-fit: contain;
}
.website-favicon-frame svg { opacity: .8; }
</style>
