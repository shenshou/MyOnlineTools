<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Search, Sparkles, Star, Clock3, ArrowRight, Layers3 } from 'lucide-vue-next'
import { tools,categories } from '../data/tools'
import { usePreferences } from '../stores/preferences'
import ToolCard from '../components/ToolCard.vue'
const route=useRoute(), prefs=usePreferences()
const search=ref(route.query.q||''), selected=ref('all')
const filtered=computed(()=>tools.filter(t=>(selected.value==='all'||t.category===selected.value)&&(!search.value||[t.name,t.desc,...t.tags].join(' ').toLowerCase().includes(search.value.toLowerCase()))))
const favoriteTools=computed(()=>tools.filter(t=>prefs.favorites.includes(t.id)))
const recentTools=computed(()=>prefs.recent.map(id=>tools.find(t=>t.id===id)).filter(Boolean))
</script>
<template>
  <section class="hero">
    <div class="hero-orb orb-one"></div><div class="hero-orb orb-two"></div>
    <div class="hero-content"><div class="eyebrow"><Sparkles :size="14"/> YOUR EVERYDAY TOOLBOX</div><h1>把繁琐的事，<span>简单解决。</span></h1><p>精选实用在线工具，轻量、快速、无需安装。打开即用，让效率回归简单。</p>
      <label class="hero-search"><Search :size="20"/><input v-model="search" placeholder="你想使用什么工具？试试搜索 JSON、文本、时间…"/><kbd>⌕</kbd></label>
      <div class="hero-meta"><span><i></i> 14 个实用工具</span><span>无需注册</span><span>数据在本地处理</span></div>
    </div>
    <div class="hero-decoration"><div class="float-card float-a"><BracesIcon/> <span>JSON</span><b>✓</b></div><div class="float-card float-b"><span class="mini-palette">●</span><span>COLOR</span><b>#6366F1</b></div><div class="float-card float-c"><span class="mini-code">01</span><span>TEXT</span><b>Ready</b></div></div>
  </section>
  <div class="content-wrap">
    <section v-if="!search && recentTools.length" class="quick-section"><div class="section-heading"><div><span class="section-kicker">PICK UP WHERE YOU LEFT OFF</span><h2><Clock3 :size="19"/> 最近使用</h2></div></div><div class="quick-list"><RouterLink v-for="t in recentTools" :key="t.id" :to="`/tool/${t.id}`" class="quick-item">{{t.name}}<ArrowRight :size="14"/></RouterLink></div></section>
    <section v-if="!search && favoriteTools.length" class="quick-section"><div class="section-heading"><div><span class="section-kicker">YOUR PERSONAL SHORTCUTS</span><h2><Star :size="19"/> 我的收藏</h2></div></div><div class="tool-grid compact-grid"><ToolCard v-for="t in favoriteTools" :key="t.id" :tool="t"/></div></section>
    <section class="tools-section"><div class="section-heading main-heading"><div><span class="section-kicker">TOOLS LIBRARY</span><h2><Layers3 :size="20"/> 工具箱</h2></div><span class="result-count">{{filtered.length}} 个工具</span></div>
      <div class="category-tabs"><button :class="{active:selected==='all'}" @click="selected='all'">全部工具 <span>14</span></button><button v-for="c in categories" :key="c.id" :class="{active:selected===c.id}" @click="selected=c.id">{{c.name}}</button></div>
      <div v-if="filtered.length" class="tool-grid"><ToolCard v-for="t in filtered" :key="t.id" :tool="t"/></div>
      <div v-else class="empty-state"><Search :size="28"/><h3>没有找到匹配的工具</h3><p>试试其他关键词，或切换工具分类。</p><button class="btn-secondary" @click="search='';selected='all'">清除筛选</button></div>
    </section>
    <section class="privacy-note"><span class="privacy-icon">✦</span><div><b>隐私优先，数据本地处理</b><p>工具在你的浏览器中运行。输入内容不会上传到服务器。</p></div></section>
  </div>
</template>
<script>
import { Braces as BracesIcon } from 'lucide-vue-next'
export default { components:{BracesIcon} }
</script>