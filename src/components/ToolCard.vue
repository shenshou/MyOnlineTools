<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Star, ArrowUpRight, FileText, Code2, ArrowLeftRight, Clock3, WandSparkles, Braces, Binary, Link, ChartNoAxesColumn, CaseSensitive, ListFilter, ArrowDownAZ, CalendarClock, Palette, Fingerprint, KeyRound, ShieldCheck, Regex, Code, Magnet } from 'lucide-vue-next'
import { usePreferences } from '../stores/preferences'
import { Button } from './ui'

const props = defineProps({ tool: { type: Object, required: true } })
const prefs = usePreferences()
const icons = { FileText, Code2, ArrowLeftRight, Clock3, WandSparkles, Braces, Binary, Link, ChartNoAxesColumn, CaseSensitive, ListFilter, ArrowDownAZ, CalendarClock, Palette, Fingerprint, KeyRound, ShieldCheck, Regex, Code, Magnet }
const Icon = computed(() => icons[props.tool.icon] || FileText)
const isFavorite = computed(() => prefs.favorites.includes(props.tool.id))
</script>

<template>
  <article class="tool-card">
    <RouterLink :to="`/tool/${tool.id}`" class="tool-card-link">
      <div class="tool-card-top">
        <span class="tool-icon" :class="tool.color"><component :is="Icon" :size="21" /></span>
        <ArrowUpRight class="card-arrow" :size="17" />
      </div>
      <h3>{{ tool.name }}</h3>
      <p>{{ tool.desc }}</p>
      <div class="tag-row"><span v-for="tag in tool.tags.slice(0, 2)" :key="tag">{{ tag }}</span></div>
    </RouterLink>
    <Button class="favorite-button" variant="ghost" size="sm" :class="{ selected: isFavorite }"
      :aria-label="isFavorite ? '取消收藏' : '收藏工具'" :aria-pressed="isFavorite"
      @click="prefs.toggleFavorite(tool.id)">
      <Star :size="16" :fill="isFavorite ? 'currentColor' : 'none'" />
    </Button>
  </article>
</template>