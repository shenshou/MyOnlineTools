<script setup>
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Search, Command, Sun, Moon, Github, Menu, X, House, Compass, Wrench } from 'lucide-vue-next'
import { usePreferences } from './stores/preferences'

const route = useRoute()
const router = useRouter()
const prefs = usePreferences()
const query = ref('')
const menuOpen = ref(false)

const navigationGroups = [
  {
    title: '工作空间',
    items: [
      { to: '/', label: '在线工具箱', icon: Wrench, active: () => route.path === '/' || route.path.startsWith('/tool/') },
    ],
  },
  {
    title: '资源管理',
    items: [
      { to: '/navigation', label: '网址导航', icon: Compass, active: () => route.path === '/navigation' },
    ],
  },
]

function search() {
  router.push({ path: '/', query: query.value ? { q: query.value } : {} })
  menuOpen.value = false
}
function closeMobileNav() { menuOpen.value = false }
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/" class="brand" @click="closeMobileNav">
          <span class="brand-mark"><Command :size="19"/></span>
          <span>My<span class="brand-accent">Online</span>Tools</span>
        </RouterLink>
        <form class="header-search" @submit.prevent="search">
          <Search :size="17"/>
          <input v-model="query" placeholder="搜索工具… 例如 JSON、Base64"/>
          <kbd>⌘ K</kbd>
        </form>
        <nav class="header-nav">
          <a href="https://github.com/shenshou/MyOnlineTools" target="_blank" rel="noreferrer"><Github :size="16"/>GitHub</a>
          <button class="icon-button" :aria-label="prefs.theme==='dark'?'切换浅色主题':'切换深色主题'" @click="prefs.theme=prefs.theme==='dark'?'light':'dark'">
            <Sun v-if="prefs.theme==='dark'" :size="18"/><Moon v-else :size="18"/>
          </button>
        </nav>
        <button class="mobile-menu icon-button" :aria-label="menuOpen?'关闭导航菜单':'打开导航菜单'" @click="menuOpen=!menuOpen">
          <X v-if="menuOpen"/><Menu v-else/>
        </button>
      </div>
    </header>

    <div class="app-body">
      <aside class="app-sidebar desktop-sidebar" aria-label="主导航">
        <template v-for="group in navigationGroups" :key="group.title">
          <div class="sidebar-group-title">{{group.title}}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="sidebar-link"
            :class="{ active: item.active() }"
          >
            <component :is="item.icon" :size="17"/>
            <span>{{item.label}}</span>
          </RouterLink>
        </template>
        <div class="sidebar-bottom">
          <span class="sidebar-bottom-mark"><House :size="14"/></span>
          <span>你的个人效率空间</span>
        </div>
      </aside>

      <div class="app-main-column">
        <main><RouterView :key="route.fullPath"/></main>
        <footer class="footer">
          <span>© {{new Date().getFullYear()}} MyOnlineTools</span>
          <span>简单 · 实用 · 即开即用</span>
          <a href="https://github.com/shenshou/MyOnlineTools" target="_blank" rel="noreferrer">开源项目 <Github :size="13"/></a>
        </footer>
      </div>
    </div>

    <div v-if="menuOpen" class="mobile-sidebar-backdrop" @click.self="closeMobileNav">
      <aside class="app-sidebar mobile-sidebar" aria-label="主导航">
        <button class="mobile-sidebar-close icon-button" aria-label="关闭导航菜单" @click="closeMobileNav"><X :size="19"/></button>
        <template v-for="group in navigationGroups" :key="group.title">
          <div class="sidebar-group-title">{{group.title}}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="sidebar-link"
            :class="{ active: item.active() }"
            @click="closeMobileNav"
          >
            <component :is="item.icon" :size="17"/>
            <span>{{item.label}}</span>
          </RouterLink>
        </template>
      </aside>
    </div>
  </div>
</template>