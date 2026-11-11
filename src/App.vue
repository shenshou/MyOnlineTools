<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { Search, Command, Sun, Moon, Github, Menu, X, House, Compass, Wrench, Globe, ArrowUpRight } from 'lucide-vue-next'
import { usePreferences } from './stores/preferences'
import { tools } from './data/tools'
import { ToastContainer, ConfirmDialog } from './components/ui'

const route = useRoute()
const router = useRouter()
const prefs = usePreferences()
const query = ref('')
const searchInput = ref(null)
const menuOpen = ref(false)
const navigationWebsites = ref([])
const searchLoading = ref(false)

const normalizedQuery = computed(() => query.value.trim().toLocaleLowerCase())
const toolResults = computed(() => {
  if (!normalizedQuery.value) return []
  return tools.filter(tool =>
    [tool.name, tool.desc, ...tool.tags].join(' ').toLocaleLowerCase().includes(normalizedQuery.value)
  ).slice(0, 5)
})
const websiteResults = computed(() => {
  if (!normalizedQuery.value) return []
  return navigationWebsites.value.filter(website =>
    [
      website.name, website.url, website.description, website.notes,
      website.categoryName, ...(website.tags || []),
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery.value)
  ).slice(0, 5)
})
const hasSearchResults = computed(() => toolResults.value.length + websiteResults.value.length > 0)

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

async function loadSearchWebsites() {
  searchLoading.value = true
  try {
    const url = 'https://raw.githubusercontent.com/shenshou/MyOnlineTools/main/public/data/navigation.json'
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error('网址数据读取失败')
    const data = await response.json()
    const categories = new Map((data.categories || []).map(category => [category.id, category.name]))
    navigationWebsites.value = (data.websites || []).map(website => ({
      ...website,
      categoryName: categories.get(website.categoryId) || '未分类',
    }))
  } catch {
    // 网址导航搜索数据不可用时，在线工具搜索仍可正常使用。
  } finally {
    searchLoading.value = false
  }
}

function goToTool(tool) {
  query.value = ''
  router.push(`/tool/${tool.id}`)
  menuOpen.value = false
}
function goToWebsite(website) {
  query.value = ''
  router.push({ path: '/navigation', query: { websiteId: website.id } })
  menuOpen.value = false
}
function search() {
  const firstTool = toolResults.value[0]
  const firstWebsite = websiteResults.value[0]
  if (firstTool) goToTool(firstTool)
  else if (firstWebsite) goToWebsite(firstWebsite)
}
function handleGlobalShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    searchInput.value?.focus()
    searchInput.value?.select()
  } else if (event.key === 'Escape') {
    query.value = ''
    searchInput.value?.blur()
  }
}
function handleNavigationDataUpdated(event) {
  const websites = event.detail?.websites
  if (!Array.isArray(websites)) return
  const categories = new Map((event.detail?.categories || []).map(category => [category.id, category.name]))
  navigationWebsites.value = websites.map(website => ({
    ...website,
    categoryName: categories.get(website.categoryId) || '未分类',
  }))
}
function closeMobileNav() { menuOpen.value = false }

onMounted(() => {
  loadSearchWebsites()
  window.addEventListener('mot-navigation-data-updated', handleNavigationDataUpdated)
  window.addEventListener('keydown', handleGlobalShortcut)
})
onBeforeUnmount(() => {
  window.removeEventListener('mot-navigation-data-updated', handleNavigationDataUpdated)
  window.removeEventListener('keydown', handleGlobalShortcut)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/" class="brand" @click="closeMobileNav">
          <span class="brand-mark"><Command :size="19"/></span>
          <span>My<span class="brand-accent">Online</span>Tools</span>
        </RouterLink>
        <div class="global-search">
          <form class="header-search" @submit.prevent="search">
            <Search :size="17"/>
            <input ref="searchInput" v-model="query" placeholder="全局搜索工具、网站…" autocomplete="off" @keydown.esc="query=''"/>
            <kbd>⌘ K</kbd>
          </form>
          <div v-if="normalizedQuery" class="global-search-results">
            <template v-if="toolResults.length">
              <div class="global-search-heading">在线工具</div>
              <button v-for="tool in toolResults" :key="tool.id" class="global-search-item" @click="goToTool(tool)">
                <span class="global-search-icon"><Wrench :size="15"/></span>
                <span class="global-search-copy"><strong>{{tool.name}}</strong><small>{{tool.desc}}</small></span>
                <ArrowUpRight :size="15" class="global-search-arrow"/>
              </button>
            </template>
            <template v-if="websiteResults.length">
              <div class="global-search-heading">网址导航</div>
              <button v-for="website in websiteResults" :key="website.id" class="global-search-item" @click="goToWebsite(website)">
                <span class="global-search-icon"><Globe :size="15"/></span>
                <span class="global-search-copy"><strong>{{website.name}}</strong><small>{{website.url}} · {{website.categoryName}}</small></span>
                <ArrowUpRight :size="15" class="global-search-arrow"/>
              </button>
            </template>
            <div v-if="!hasSearchResults" class="global-search-empty">
              {{searchLoading ? '正在加载网址数据…' : '没有找到匹配的工具或网站'}}
            </div>
            <div v-if="toolResults.length + websiteResults.length > 0" class="global-search-footer">
              找到 {{toolResults.length + websiteResults.length}} 个结果 · 点击结果跳转
            </div>
          </div>
        </div>
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
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.global-search{position:relative;flex:1;max-width:430px;min-width:180px}
.global-search .header-search{max-width:none;width:100%}
.global-search-results{position:absolute;top:calc(100% + 9px);left:0;right:0;z-index:60;max-height:min(70vh,520px);overflow:auto;padding:7px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 14px 38px #10132324}
.global-search-heading{padding:9px 10px 6px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.4px}
.global-search-item{width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border:0;border-radius:8px;background:transparent;text-align:left;color:var(--text)}
.global-search-item:hover{background:var(--surface-2)}
.global-search-icon{width:29px;height:29px;flex-shrink:0;display:grid;place-items:center;border-radius:8px;background:var(--surface-2);color:var(--primary)}
.global-search-copy{min-width:0;flex:1;display:grid;gap:3px}
.global-search-copy strong{font-size:11px;font-weight:650}
.global-search-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:9px}
.global-search-arrow{flex-shrink:0;color:var(--muted)}
.global-search-empty{padding:22px 12px;text-align:center;color:var(--muted);font-size:11px}
.global-search-footer{margin-top:5px;padding:8px 10px 4px;border-top:1px solid var(--line);color:var(--muted);font-size:9px}
@media(max-width:650px){.global-search{display:none}}
</style>