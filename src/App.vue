<script setup>
import { computed } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Search, Command, Sun, Moon, Github, House, Heart, Clock3, Menu, X } from 'lucide-vue-next'
import { usePreferences } from './stores/preferences'
import { tools } from './data/tools'
import { ref } from 'vue'
const route=useRoute(), router=useRouter(), prefs=usePreferences()
const query=ref(''), menuOpen=ref(false)
const activeTool=computed(()=>tools.find(t=>t.id===route.params.id))
function search(){ router.push({path:'/',query:query.value?{q:query.value}:{}}); menuOpen.value=false }
</script>
<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/" class="brand"><span class="brand-mark"><Command :size="19"/></span><span>My<span class="brand-accent">Online</span>Tools</span></RouterLink>
        <form class="header-search" @submit.prevent="search"><Search :size="17"/><input v-model="query" placeholder="搜索工具… 例如 JSON、Base64"/><kbd>⌘ K</kbd></form>
        <nav class="header-nav"><RouterLink to="/"><House :size="16"/>首页</RouterLink><a href="https://github.com/shenshou/MyOnlineTools" target="_blank" rel="noreferrer"><Github :size="16"/>GitHub</a><button class="icon-button" :aria-label="prefs.theme==='dark'?'切换浅色主题':'切换深色主题'" @click="prefs.theme=prefs.theme==='dark'?'light':'dark'"><Sun v-if="prefs.theme==='dark'" :size="18"/><Moon v-else :size="18"/></button></nav>
        <button class="mobile-menu icon-button" @click="menuOpen=!menuOpen"><X v-if="menuOpen"/><Menu v-else/></button>
      </div>
      <div v-if="menuOpen" class="mobile-nav"><RouterLink to="/" @click="menuOpen=false">首页</RouterLink><a href="https://github.com/shenshou/MyOnlineTools">GitHub</a></div>
    </header>
    <main><RouterView :key="route.fullPath"/></main>
    <footer class="footer"><span>© {{new Date().getFullYear()}} MyOnlineTools</span><span>简单 · 实用 · 即开即用</span><a href="https://github.com/shenshou/MyOnlineTools" target="_blank" rel="noreferrer">开源项目 <Github :size="13"/></a></footer>
  </div>
</template>