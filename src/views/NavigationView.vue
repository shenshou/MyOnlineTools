<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Search, Plus, LayoutGrid, List, Star, ExternalLink, Pencil, Trash2, X, Save,
  Download, Upload, LogIn, LogOut, Check, AlertCircle, Globe, ChevronDown, ArrowUpDown,
  Settings, FileJson, RefreshCw, Info, Bookmark, CircleHelp, ArrowUp, ArrowDown
} from 'lucide-vue-next'
import { normalizeNavigationData } from '../modules/navigation/validation'
import { useNavigationFilters } from '../modules/navigation/useNavigationFilters'
import WebsiteFavicon from '../modules/navigation/components/WebsiteFavicon.vue'
import NavigationDetailsDrawer from '../modules/navigation/components/NavigationDetailsDrawer.vue'
import { mergeNavigationData } from '../modules/navigation/operations'
import { buildWebsiteRecord, createCategory, renameCategory as renameCategoryData, removeCategory as removeCategoryData } from '../modules/navigation/editor'
import { useNavigationData } from '../modules/navigation/useNavigationData'
import { useNavigationAdmin } from '../modules/navigation/useNavigationAdmin'
import { useNavigationPersistence } from '../modules/navigation/useNavigationPersistence'
import { useToast } from '../composables/useToast'
import { useConfirm } from '../composables/useConfirm'
import { Button, Input, Textarea, Select, EmptyState, Loading, Modal } from '../components/ui'

const route = useRoute()
const { showToast } = useToast()
const { confirm } = useConfirm()
const sortOptions = [{value:'custom',label:'自定义排序'},{value:'newest',label:'最近添加'},{value:'updated',label:'最近更新'},{value:'name-asc',label:'名称升序'},{value:'name-desc',label:'名称降序'}]
const categoryIconOptions = [{value:'bot',label:'🤖 AI'},{value:'code',label:'💻 开发'},{value:'palette',label:'🎨 设计'},{value:'clapperboard',label:'🎬 娱乐'},{value:'download',label:'⬇️ 下载'},{value:'graduation-cap',label:'🎓 学习'},{value:'globe',label:'🌐 实用'},{value:'folder',label:'📁 文件夹'}]
const { data, baseline, loading, loadError, dirty, snapshot, loadData } = useNavigationData()
const search = ref('')
const selectedCategory = ref('all')
const selectedTag = ref('')
const favoritesOnly = ref(false)
function readPreference(key, fallback, allowed) {
  try {
    const value = localStorage.getItem(key)
    return allowed.includes(value) ? value : fallback
  } catch { return fallback }
}
function writePreference(key, value) {
  try { localStorage.setItem(key, value) } catch { /* Preferences remain available for this page session. */ }
}
const viewMode = ref(readPreference('mot-navigation-view', 'card', ['card', 'list']))
const sortMode = ref(readPreference('mot-navigation-sort', 'custom', ['custom', 'newest', 'updated', 'name-asc', 'name-desc']))
const selectedWebsite = ref(null)
const showForm = ref(false)
const editingId = ref(null)
const showAdmin = ref(false)
const showImport = ref(false)
const showCategoryManager = ref(false)
const { admin, tokenInput: adminTokenInput, busy, restore: restoreAdminSession, login: authorizeAdmin, logout: clearAdminSession } = useNavigationAdmin()
const message = ref('')
const errorMessage = ref('')
const saveConflict = ref(false)
const form = ref(emptyForm())
const importText = ref('')
const importMode = ref('merge')
const newCategory = ref('')
const categoryEdit = ref(null)

function emptyForm() {
  return { name: '', url: '', favicon: '', description: '', notes: '', categoryId: 'other', tagsText: '', favorite: false }
}
const { categoryCounts, allTags, filtered } = useNavigationFilters({ data, search, selectedCategory, selectedTag, favoritesOnly, sortMode })
function domainOf(url) { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' } }
function setView(mode) { if (!['card', 'list'].includes(mode)) return; viewMode.value = mode; writePreference('mot-navigation-view', mode) }
function setSort(mode) { if (!['custom', 'newest', 'updated', 'name-asc', 'name-desc'].includes(mode)) return; sortMode.value = mode; writePreference('mot-navigation-sort', mode) }
function markMessage(text) { message.value = text; errorMessage.value = ''; saveConflict.value = false }
function markError(text) { errorMessage.value = text; message.value = ''; saveConflict.value = false }

const { save: persistNavigationData } = useNavigationPersistence({
  data,
  baseline,
  admin,
  busy,
  saveConflict,
  snapshot,
  onMessage: markMessage,
  onError: markError,
  onUnauthorized: () => { showAdmin.value = true },
})

onMounted(async () => {
  await loadData()
  const targetWebsite = data.value.websites.find(website => website.id === route.query.websiteId)
  if (targetWebsite) selectedWebsite.value = targetWebsite
  try {
    const account = await restoreAdminSession()
    if (account) markMessage(`已恢复管理员授权：${account}`)
  } catch {
    markError('保存的 GitHub 授权已失效，请重新登录。')
  }
})

function openAdd() {
  if (!admin.value) { showAdmin.value = true; return }
  editingId.value = null
  form.value = { ...emptyForm(), categoryId: selectedCategory.value !== 'all' ? selectedCategory.value : (data.value.categories[0]?.id || 'other') }
  showForm.value = true
}
function openEdit(item) {
  if (!admin.value) { showAdmin.value = true; return }
  editingId.value = item.id
  form.value = { ...item, tagsText: (item.tags || []).join(', ') }
  selectedWebsite.value = null
  showForm.value = true
}
async function saveForm() {
  if (!admin.value) { showAdmin.value = true; return }
  try {
    const record = buildWebsiteRecord(form.value, data.value.websites, editingId.value, Date.now(), crypto.randomUUID())
    const index = data.value.websites.findIndex(website => website.id === record.id)
    if (index >= 0) data.value.websites[index] = record
    else data.value.websites.push(record)
    showForm.value = false
    markMessage('更改已暂存在当前页面，请点击「保存到 GitHub」同步。')
  } catch (error) { markError(error.message || '请检查输入内容') }
}
async function deleteWebsite(item) {
  if (!admin.value) { showAdmin.value = true; return }
  const ok = await confirm({ title: '删除网址', message: `确定删除「${item.name}」吗？此操作将在保存后写入仓库。`, confirmText: '删除', tone: 'danger' })
  if (!ok) return
  data.value.websites = data.value.websites.filter(w => w.id !== item.id)
  selectedWebsite.value = null
  markMessage('已删除，尚未同步到 GitHub。')
}
function moveWebsite(item, direction) {
  if (!admin.value) { showAdmin.value = true; return }
  const ordered = [...data.value.websites].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  const index = ordered.findIndex(w => w.id === item.id)
  const target = ordered[index + direction]
  if (!target) return
  const order = item.sortOrder
  item.sortOrder = target.sortOrder
  target.sortOrder = order
  item.updatedAt = Date.now()
  target.updatedAt = Date.now()
}
function moveCategory(category, direction) {
  if (!admin.value) { showAdmin.value = true; return }
  const ordered = [...data.value.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  const index = ordered.findIndex(c => c.id === category.id)
  const target = ordered[index + direction]
  if (!target) return
  const order = category.sortOrder
  category.sortOrder = target.sortOrder
  target.sortOrder = order
}
function toggleFavorite(item) {
  if (!admin.value) {
    showToast('只有管理员模式才能修改公共收藏状态。', 'warning')
    return
  }
  item.favorite = !item.favorite
  item.updatedAt = Date.now()
}
function openWebsite(item) { window.open(item.url, '_blank', 'noopener,noreferrer') }

function saveToGitHub() { return persistNavigationData() }

async function loginAdmin() {
  if (!adminTokenInput.value.trim()) { markError('请填写 Fine-grained Personal Access Token'); return }
  try {
    const account = await authorizeAdmin()
    markMessage(`已授权：${account}。访问令牌保存在当前标签页会话中，退出管理员模式后会清除。`)
  } catch (error) {
    markError(error.message || 'GitHub 授权失败')
  }
}
function logout() {
  clearAdminSession()
  showAdmin.value = false
  markMessage('已退出管理员模式。')
}
async function importData() {
  if (!admin.value) { showAdmin.value = true; return }
  try {
    const incoming = normalizeNavigationData(JSON.parse(importText.value))
    if (importMode.value === 'replace') {
      const ok = await confirm({ title: '覆盖导入数据', message: '覆盖导入将替换当前全部网址和分类，确定继续吗？', confirmText: '覆盖导入', tone: 'danger' })
      if (!ok) return
      data.value = { schemaVersion: 1, categories: incoming.categories, websites: incoming.websites, updatedAt: Date.now() }
    } else {
      const result = mergeNavigationData(data.value, incoming)
      data.value = result.data
      markMessage(`合并完成：新增 ${result.added} 条，更新 ${result.updated} 条。尚未保存到 GitHub。`)
    }
    showImport.value = false
    importText.value = ''
    if (importMode.value === 'replace') markMessage('覆盖导入完成，尚未保存到 GitHub。')
  } catch (error) { markError(error.message || '导入失败') }
}
function exportData() {
  const blob = new Blob([JSON.stringify(data.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'navigation.json'; a.click()
  URL.revokeObjectURL(url)
}
function addCategory() {
  if (!admin.value) { showAdmin.value = true; return }
  try {
    data.value.categories = createCategory(data.value.categories, newCategory.value, `custom-${crypto.randomUUID()}`)
    newCategory.value = ''
    markMessage('分类已添加，尚未同步到 GitHub。')
  } catch (error) { markError(error.message) }
}
function renameCategory(category) {
  if (!admin.value) { showAdmin.value = true; return }
  try {
    data.value.categories = renameCategoryData(data.value.categories, category.id, categoryEdit.value?.name)
    categoryEdit.value = null
    markMessage('分类名称已修改，尚未同步到 GitHub。')
  } catch (error) { markError(error.message) }
}
async function removeCategory(category) {
  if (!admin.value) { showAdmin.value = true; return }
  if (data.value.categories.length <= 1) { markError('至少保留一个分类'); return }
  const target = data.value.categories.find(c => c.id !== category.id)
  const ok = await confirm({ title: '删除分类', message: `删除「${category.name}」并将其中网址移动到「${target.name}」？`, confirmText: '删除分类', tone: 'danger' })
  if (!ok) return
  try {
    data.value = removeCategoryData(data.value, category.id)
    if (selectedCategory.value === category.id) selectedCategory.value = 'all'
    markMessage('分类已删除，相关网址已移动到其他分类，尚未同步到 GitHub。')
  } catch (error) { markError(error.message) }
}
function openImportFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { importText.value = String(reader.result || ''); showImport.value = true }
  reader.readAsText(file)
  event.target.value = ''
}
function iconFor(category) {
  const icons = { bot: '🤖', code: '💻', palette: '🎨', clapperboard: '🎬', download: '⬇️', 'graduation-cap': '🎓', globe: '🌐', folder: '📁' }
  return icons[category.icon] || '📁'
}
</script>

<template>
  <div class="nav-page">
    <section class="nav-heading">
      <div><div class="nav-eyebrow">PERSONAL BOOKMARK LIBRARY</div><h1>网址导航</h1><p>集中收藏、整理和管理常用网站。</p></div>
      <div class="nav-heading-actions">
        <Button class="nav-btn nav-btn-light" @click="showAdmin=true" type="button" variant="secondary"><LogIn :size="15"/>{{admin ? '管理员已授权' : '管理员登录'}}</Button>
        <Button class="nav-btn nav-btn-primary" @click="admin ? openAdd() : showAdmin=true" type="button" variant="primary"><Plus :size="16"/>添加网址</Button>
      </div>
    </section>

    <section class="nav-summary">
      <div><strong>{{data.websites.length}}</strong><span>个网址</span></div>
      <div><strong>{{data.categories.length}}</strong><span>个分类</span></div>
      <div><strong>{{data.websites.filter(w=>w.favorite).length}}</strong><span>个收藏</span></div>
      <div class="nav-summary-status"><span :class="dirty ? 'status-unsaved' : 'status-saved'"></span>{{dirty ? '有未保存的更改' : '数据已同步'}}</div>
    </section>

    <div v-if="loadError" class="nav-alert nav-alert-error"><AlertCircle :size="16"/>{{loadError}} <button @click="loadData">重试</button></div>
    <div v-if="message" class="nav-alert nav-alert-success"><Check :size="16"/>{{message}}<button @click="message=''"><X :size="14"/></button></div>
    <div v-if="errorMessage" class="nav-alert nav-alert-error"><AlertCircle :size="16"/>{{errorMessage}}<button v-if="saveConflict" type="button" @click="exportData">导出待保存数据</button><button type="button" @click="errorMessage='';saveConflict=false"><X :size="14"/></button></div>

    <div class="nav-layout">
      <aside class="nav-sidebar">
        <div class="nav-side-title">网址分类</div>
        <button :class="{active:selectedCategory==='all' && !favoritesOnly}" @click="selectedCategory='all';favoritesOnly=false"><Globe :size="16"/>全部网址<span>{{data.websites.length}}</span></button>
        <button :class="{active:favoritesOnly}" @click="favoritesOnly=!favoritesOnly;selectedCategory='all'"><Star :size="16"/>我的收藏<span>{{data.websites.filter(w=>w.favorite).length}}</span></button>
        <div class="nav-side-divider"></div>
        <button v-for="c in data.categories.slice().sort((a,b)=>a.sortOrder-b.sortOrder)" :key="c.id" :class="{active:selectedCategory===c.id && !favoritesOnly}" @click="selectedCategory=c.id;favoritesOnly=false;selectedTag=''"><span class="nav-category-emoji">{{iconFor(c)}}</span>{{c.name}}<span>{{categoryCounts[c.id] || 0}}</span></button>
        <button class="nav-manage-cats" v-if="admin" @click="showCategoryManager=true"><Settings :size="14"/>管理分类</button>
        <div v-if="allTags.length" class="nav-tags-block"><div class="nav-side-title">标签</div><button v-for="tag in allTags" :key="tag" :class="{active:selectedTag===tag}" @click="selectedTag=selectedTag===tag?'':tag"># {{tag}}</button></div>
      </aside>

      <section class="nav-main">
        <div class="nav-toolbar">
          <label class="nav-search"><Search :size="17"/><input v-model="search" aria-label="搜索网址导航" placeholder="搜索名称、网址、简介、备注或标签…"/><kbd>⌘ K</kbd></label>
          <div class="nav-toolbar-actions">
            <Select :model-value="sortMode" :options="sortOptions" aria-label="排序方式" @update:model-value="setSort"/>
            <div class="nav-view-toggle"><button :class="{active:viewMode==='card'}" aria-label="卡片视图" @click="setView('card')"><LayoutGrid :size="16"/></button><button :class="{active:viewMode==='list'}" aria-label="列表视图" @click="setView('list')"><List :size="17"/></button></div>
            <Button class="nav-icon-action" title="导入 JSON" @click="admin ? showImport=true : showAdmin=true" type="button" variant="ghost" size="sm"><Upload :size="16"/></Button>
            <Button class="nav-icon-action" title="导出 JSON" @click="exportData" type="button" variant="ghost" size="sm"><Download :size="16"/></Button>
          </div>
        </div>

        <div v-if="loading" class="nav-empty"><Loading label="正在加载网址…" block/></div>
        <EmptyState v-else-if="!filtered.length" :title="search || selectedTag || favoritesOnly ? '没有找到匹配的网址' : '这里还没有网址'" description="添加常用网站，建立自己的网址收藏库。" action-label="添加第一个网址" @action="openAdd"><template #icon><Globe :size="28"/></template></EmptyState>

        <div v-else-if="viewMode==='card'" class="nav-card-grid">
          <article v-for="item in filtered" :key="item.id" class="website-card">
            <div class="website-card-top">
              <WebsiteFavicon :website="item" :size="34"/>
              <Button class="website-favorite" variant="ghost" size="sm" :class="{selected:item.favorite}" :aria-label="item.favorite?'取消收藏':'收藏'" :aria-pressed="item.favorite" @click="toggleFavorite(item)"><Star :size="17" :fill="item.favorite?'currentColor':'none'"/></Button>
            </div>
            <button class="website-name" @click="openWebsite(item)">{{item.name}} <ExternalLink :size="12"/></button>
            <div class="website-domain">{{domainOf(item.url)}}</div>
            <p class="website-description">{{item.description || '暂无简介'}}</p>
            <div class="website-card-bottom"><span>{{data.categories.find(c=>c.id===item.categoryId)?.name || '未分类'}}</span><button @click="selectedWebsite=item">详情 <Info :size="13"/></button></div>
          </article>
        </div>

        <div v-else class="website-list">
          <div v-for="item in filtered" :key="item.id" class="website-list-row">
            <span class="website-list-icon"><WebsiteFavicon :website="item" :size="22"/></span>
            <div class="website-list-main"><button class="website-name" @click="openWebsite(item)">{{item.name}} <ExternalLink :size="12"/></button><span>{{domainOf(item.url)}}</span><p>{{item.description || '暂无简介'}}</p></div>
            <span class="website-list-category">{{data.categories.find(c=>c.id===item.categoryId)?.name || '未分类'}}</span>
            <Button class="website-favorite" variant="ghost" size="sm" :class="{selected:item.favorite}" :aria-label="item.favorite?'取消收藏':'收藏'" :aria-pressed="item.favorite" @click="toggleFavorite(item)"><Star :size="17" :fill="item.favorite?'currentColor':'none'"/></Button>
            <button class="website-detail-link" @click="selectedWebsite=item">详情</button>
          </div>
        </div>
      </section>
    </div>

    <NavigationDetailsDrawer
      v-if="selectedWebsite"
      :website="selectedWebsite"
      :categories="data.categories"
      :admin="admin"
      @close="selectedWebsite = null"
      @visit="openWebsite"
      @edit="openEdit"
      @delete="deleteWebsite"
    />

    <Modal v-model="showForm" :title="editingId ? '编辑网址' : '添加网址'" size="lg">
        
        <form @submit.prevent="saveForm" class="nav-form">
          <Input v-model="form.name" label="网站名称 *" required maxlength="100" placeholder="例如：OpenAI" />
          <Input v-model="form.url" label="网址 *" required placeholder="https://example.com" />
          <Input v-model="form.favicon" label="网站图标地址" placeholder="留空自动获取网站图标，可填写自定义图标 URL" />
          <Textarea v-model="form.description" label="简介" rows="2" maxlength="300" placeholder="简短介绍这个网站" />
          <Textarea v-model="form.notes" label="详细备注" rows="5" placeholder="记录用途、特点、使用说明等详细信息" />
          <div class="nav-form-row"><label>分类<select v-model="form.categoryId"><option v-for="c in data.categories" :key="c.id" :value="c.id">{{c.name}}</option></select></label><Input v-model="form.tagsText" label="标签" placeholder="多个标签用逗号分隔" /></div>
          <label class="nav-check-label"><input v-model="form.favorite" type="checkbox"/>加入收藏</label>
          <div class="nav-modal-actions"><Button type="button" class="nav-btn nav-btn-light" @click="showForm=false" variant="secondary">取消</Button><Button type="submit" class="nav-btn nav-btn-primary" variant="primary"><Check :size="15"/>保存更改</Button></div>
        </form>
      </Modal>

        <Modal v-model="showAdmin" title="GitHub 管理员授权" size="md">
        
        <div class="nav-modal-body">
          <div v-if="admin" class="nav-authorized"><Check :size="20"/>当前已获得仓库写入权限。访问令牌仅保存在当前页面内存中。</div>
          <template v-else>
            <p>使用 GitHub Fine-grained Personal Access Token 授权。令牌不会写入网站源码，也不会保存到浏览器本地存储。</p>
            <Input v-model="adminTokenInput" label="Personal Access Token" type="password" autocomplete="off" placeholder="github_pat_…" />
            <Button class="nav-btn nav-btn-primary nav-full" :disabled="busy" @click="loginAdmin" type="button" variant="primary"><LogIn :size="15"/>{{busy ? '正在验证…' : '验证并登录'}}</Button>
            <p class="nav-security-note"><Info :size="14"/>请在 <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">GitHub 设置</a>创建 Fine-grained token：Repository access 仅选择 shenshou/MyOnlineTools；Repository permissions 中将 Contents 设为 Read and write。建议设置有效期。不要把令牌发给任何人。</p>
          </template>
        </div>
        <div class="nav-modal-actions"><Button v-if="admin" class="nav-btn nav-btn-light nav-danger" @click="logout" type="button" variant="secondary"><LogOut :size="15"/>退出管理员</Button><Button class="nav-btn nav-btn-light" @click="showAdmin=false" type="button" variant="secondary">关闭</Button></div>
      </Modal>

        <Modal v-model="showImport" title="导入网址数据" size="md">
        
        <div class="nav-modal-body"><p>选择此前导出的 navigation.json 文件，或直接粘贴 JSON 内容。</p><label class="nav-file-pick"><FileJson :size="17"/>选择 JSON 文件<input type="file" accept=".json,application/json" @change="openImportFile"/></label><Textarea v-model="importText" label="JSON 数据" rows="9" placeholder="粘贴 JSON 数据…" /><div class="nav-radio-row"><label><input v-model="importMode" type="radio" value="merge"/>合并导入（按网址去重）</label><label><input v-model="importMode" type="radio" value="replace"/>覆盖导入</label></div></div>
        <div class="nav-modal-actions"><Button class="nav-btn nav-btn-light" @click="showImport=false" type="button" variant="secondary">取消</Button><Button class="nav-btn nav-btn-primary" @click="importData" type="button" variant="primary"><Upload :size="15"/>开始导入</Button></div>
      </Modal>

        <Modal v-model="showCategoryManager" title="管理分类" size="lg">
        
        <div class="nav-modal-body"><div class="nav-add-category"><Input v-model="newCategory" placeholder="输入新分类名称" @keydown.enter.prevent="addCategory" /><Button class="nav-btn nav-btn-primary" @click="addCategory" type="button" variant="primary"><Plus :size="14"/>添加</Button></div><div v-for="c in data.categories" :key="c.id" class="nav-category-edit"><span>{{iconFor(c)}}</span><input v-if="categoryEdit!==null && categoryEdit.id===c.id" v-model="categoryEdit.name" @keydown.enter="renameCategory(c)"/><strong v-else>{{c.name}}</strong><Select v-model="c.icon" :options="categoryIconOptions" aria-label="分类图标" /><span class="nav-category-count">{{categoryCounts[c.id] || 0}} 个网址</span><Button class="nav-icon-action" @click="moveCategory(c,-1)" title="上移分类" type="button" variant="ghost" size="sm"><ArrowUp :size="14"/></Button><Button class="nav-icon-action" @click="moveCategory(c,1)" title="下移分类" type="button" variant="ghost" size="sm"><ArrowDown :size="14"/></Button><Button class="nav-icon-action" @click="categoryEdit={id:c.id,name:c.name}" type="button" variant="ghost" size="sm"><Pencil :size="14"/></Button><Button class="nav-icon-action nav-danger" @click="removeCategory(c)" type="button" variant="ghost" size="sm"><Trash2 :size="14"/></Button><Button v-if="categoryEdit!==null && categoryEdit.id===c.id" class="nav-icon-action" @click="renameCategory(c)" type="button" variant="ghost" size="sm"><Check :size="14"/></Button></div></div>
        <div class="nav-modal-actions"><Button class="nav-btn nav-btn-light" @click="showCategoryManager=false" type="button" variant="secondary">完成</Button></div>
      </Modal>

        <div v-if="dirty && admin" class="nav-save-bar"><span><AlertCircle :size="16"/>有未保存的更改</span><Button class="nav-btn nav-btn-primary" :loading="busy" :disabled="busy" @click="saveToGitHub"><Save :size="15"/>{{busy ? '正在保存…' : '保存到 GitHub'}}</Button></div>
  </div>
</template>
<style scoped>
.nav-page{max-width:1180px;margin:0 auto;padding:34px 28px 90px;color:var(--text)}.nav-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:22px}.nav-eyebrow{font-size:9px;letter-spacing:1.5px;color:var(--muted);font-weight:700}.nav-heading h1{font-size:29px;letter-spacing:-.8px;margin:7px 0 5px}.nav-heading p{margin:0;color:var(--muted);font-size:12px}.nav-heading-actions,.nav-toolbar-actions{display:flex;align-items:center;gap:8px}.nav-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--line);border-radius:var(--radius-md);padding:9px 13px;font-size:11px;font-weight:600;cursor:pointer}.nav-btn-light{background:var(--surface);color:var(--text)}.nav-btn-primary{background:var(--primary);border-color:var(--primary);color:white}.nav-btn-primary:hover{background:var(--primary-dark)}.nav-btn:disabled{opacity:.55;cursor:not-allowed}.nav-danger{color:var(--danger)!important}.nav-full{width:100%;margin-top:12px}.nav-summary{display:flex;align-items:center;gap:28px;padding:15px 19px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);margin-bottom:17px}.nav-summary>div{display:flex;align-items:baseline;gap:6px}.nav-summary strong{font-size:20px;font-weight:800}.nav-summary span{font-size:11px;color:var(--muted)}.nav-summary .nav-summary-status{margin-left:auto;align-items:center;gap:7px}.nav-summary-status>span{width:7px;height:7px;border-radius:50%}.status-unsaved{background:var(--warning)}.status-saved{background:var(--success)}.nav-layout{display:grid;grid-template-columns:205px minmax(0,1fr);gap:20px;align-items:start}.nav-sidebar{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);padding:14px 10px;position:sticky;top:88px}.nav-side-title{font-size:10px;font-weight:700;color:var(--muted);padding:5px 9px 10px}.nav-sidebar>button{width:100%;display:flex;align-items:center;gap:9px;padding:9px;border:0;background:transparent;color:var(--muted);font-size:11px;text-align:left;border-radius:var(--radius-sm)}.nav-sidebar>button:hover,.nav-sidebar>button.active{background:var(--surface-2);color:var(--primary)}.nav-sidebar>button>span:last-child{margin-left:auto;font-size:10px;color:var(--muted)}.nav-category-emoji{font-size:14px}.nav-side-divider{height:1px;background:var(--line);margin:9px 4px}.nav-sidebar>button.nav-manage-cats{margin-top:8px;border-top:1px solid var(--line);border-radius:0;padding-top:13px}.nav-tags-block{border-top:1px solid var(--line);margin-top:10px;padding-top:10px}.nav-tags-block button{display:inline-block;border:1px solid var(--line);background:var(--surface-2);color:var(--muted);border-radius:20px;padding:5px 8px;margin:3px;font-size:10px}.nav-tags-block button.active{border-color:var(--primary);color:var(--primary)}.nav-main{min-width:0}.nav-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.nav-search{height:39px;display:flex;align-items:center;gap:9px;padding:0 11px;flex:1;min-width:150px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);color:var(--muted)}.nav-search input{border:0;outline:0;min-width:0;flex:1;background:transparent;color:var(--text);font-size:11px}.nav-search kbd{font-size:9px;border:1px solid var(--line);border-radius:var(--radius-sm);padding:3px 5px}.nav-toolbar-actions select{height:36px;border:1px solid var(--line);border-radius:var(--radius-sm);padding:0 8px;background:var(--surface);color:var(--text);font-size:10px;max-width:130px}.nav-view-toggle{display:flex;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden}.nav-view-toggle button{width:32px;height:34px;display:grid;place-items:center;border:0;background:var(--surface);color:var(--muted)}.nav-view-toggle button.active{background:var(--surface-2);color:var(--primary)}.nav-icon-action{display:grid;place-items:center;width:33px;height:33px;border:1px solid var(--line);border-radius:var(--radius-sm);background:var(--surface);color:var(--muted)}.nav-icon-action:hover{color:var(--primary);border-color:var(--primary)}.nav-card-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.website-card{min-width:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);padding:14px;transition:border-color var(--transition-fast),transform var(--transition-fast)}.website-card:hover{border-color:var(--primary);transform:translateY(-2px)}.website-card-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.website-favicon,.website-favicon-fallback{width:34px;height:34px;border-radius:var(--radius-md);object-fit:contain;background:var(--surface-2);display:grid;place-items:center;color:var(--muted);padding:6px}.website-favorite{border:0;background:transparent;color:var(--line-strong);padding:4px;display:grid;place-items:center}.website-favorite.selected{color:var(--warning)}.website-name{display:inline-flex;align-items:center;gap:5px;max-width:100%;border:0;background:transparent;padding:0;color:var(--text);font-size:13px;font-weight:700;text-align:left;cursor:pointer}.website-name svg{flex-shrink:0;color:var(--muted)}.website-name:hover{color:var(--primary)}.website-domain{font-size:10px;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.website-description{font-size:10px;line-height:1.65;color:var(--muted);height:33px;overflow:hidden;margin:10px 0}.website-card-bottom{display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--line);padding-top:9px}.website-card-bottom>span{font-size:9px;color:var(--muted)}.website-card-bottom button,.website-detail-link{display:flex;align-items:center;gap:4px;border:0;background:transparent;color:var(--primary);font-size:10px}.website-list{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-md);overflow:hidden}.website-list-row{display:flex;align-items:center;gap:13px;padding:12px 14px;border-bottom:1px solid var(--line)}.website-list-row:last-child{border-bottom:0}.website-list-icon{width:34px;height:34px;display:grid;place-items:center;flex-shrink:0;border-radius:var(--radius-md);background:var(--surface-2);color:var(--muted)}.website-list-icon img{width:22px;height:22px;object-fit:contain}.website-list-main{min-width:0;flex:1}.website-list-main>span{display:block;color:var(--muted);font-size:9px;margin-top:3px}.website-list-main p{font-size:10px;color:var(--muted);margin:4px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.website-list-category{font-size:10px;color:var(--muted);min-width:65px}.website-detail-link{padding:6px}.nav-empty{min-height:270px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:var(--surface);border:1px dashed var(--line);border-radius:var(--radius-lg);color:var(--muted)}.nav-empty strong{color:var(--text);font-size:14px}.nav-empty p{font-size:11px;margin:0 0 5px}.nav-alert{display:flex;align-items:center;gap:8px;padding:10px 12px;border-radius:var(--radius-md);font-size:11px;margin:12px 0}.nav-alert button{margin-left:auto;border:0;background:transparent;color:inherit;display:flex;align-items:center}.nav-alert button+button{margin-left:0}.nav-alert-success{background:var(--success-soft);color:var(--success)}.nav-alert-error{background:var(--danger-soft);color:var(--danger)}.nav-save-bar{position:fixed;z-index:var(--z-dropdown);bottom:16px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:18px;padding:9px 12px 9px 15px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-md)}.nav-save-bar>span{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);white-space:nowrap}.nav-drawer-backdrop,.nav-modal-backdrop{position:fixed;inset:0;z-index:var(--z-overlay);background:var(--overlay-backdrop);display:flex}.nav-drawer-backdrop{justify-content:flex-end}.nav-drawer{width:min(470px,100%);height:100%;background:var(--surface);box-shadow:var(--shadow-lg);display:flex;flex-direction:column}.nav-drawer-head,.nav-modal-head{height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:1px solid var(--line);flex-shrink:0}.nav-drawer-head>span{font-size:13px;font-weight:700}.nav-drawer-content{padding:22px;overflow:auto}.nav-drawer-brand{display:flex;align-items:center;gap:13px;margin-bottom:19px}.nav-drawer-brand .website-favicon-fallback{width:48px;height:48px}.nav-drawer-brand h2{font-size:19px;margin:0 0 5px}.nav-drawer-brand a{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--muted)}.nav-drawer-actions{display:flex;gap:8px;padding-bottom:19px;border-bottom:1px solid var(--line)}.nav-detail-section{padding:17px 0;border-bottom:1px solid var(--line)}.nav-detail-section label{font-size:10px;font-weight:700;color:var(--muted)}.nav-detail-section p,.nav-detail-section>a{display:block;font-size:12px;line-height:1.8;margin:8px 0 0;overflow-wrap:anywhere}.nav-detail-section>a{color:var(--primary)}.nav-detail-notes{white-space:pre-wrap}.website-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.website-tags span{padding:4px 7px;background:var(--surface-2);border-radius:var(--radius-sm);color:var(--muted);font-size:10px}.nav-detail-meta{display:grid;gap:7px;padding-top:17px;color:var(--muted);font-size:9px}.nav-modal-backdrop{z-index:var(--z-modal);align-items:center;justify-content:center;padding:18px}.nav-modal{width:min(520px,100%);max-height:min(90vh,820px);overflow:auto;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg)}.nav-modal-head h2{font-size:15px;margin:0}.nav-modal-head button{border:0;background:transparent;color:var(--muted);display:grid;place-items:center}.nav-modal-body{padding:19px 20px}.nav-modal-body>p{font-size:11px;color:var(--muted);line-height:1.7;margin:0 0 15px}.nav-form{padding:17px 20px;display:grid;gap:12px}.nav-form>label,.nav-form-row label,.nav-field-label{display:grid;gap:6px;font-size:10px;font-weight:600;color:var(--muted)}.nav-form label>b{display:inline;color:var(--danger)}.nav-form input:not([type=checkbox]),.nav-form textarea,.nav-form select,.nav-field-label input,.nav-add-category input,.nav-category-edit input,.nav-modal-body textarea{width:100%;border:1px solid var(--line);border-radius:var(--radius-sm);padding:9px 10px;background:var(--surface-2);color:var(--text);outline:0;font-size:11px;resize:vertical}.nav-form input:focus,.nav-form textarea:focus,.nav-form select:focus,.nav-field-label input:focus,.nav-modal-body textarea:focus{border-color:var(--primary)}.nav-form-row{display:grid;grid-template-columns:1fr 1.4fr;gap:10px}.nav-check-label{display:flex!important;align-items:center;gap:8px!important}.nav-check-label input,.nav-radio-row input{accent-color:var(--primary)}.nav-modal-actions{display:flex;justify-content:flex-end;gap:8px;padding:13px 20px;border-top:1px solid var(--line)}.nav-device-code{margin-top:15px;padding:15px;border:1px dashed var(--primary);border-radius:var(--radius-md);display:grid;gap:8px;text-align:center}.nav-device-code span,.nav-device-code small{font-size:10px;color:var(--muted)}.nav-device-code strong{font-size:25px;letter-spacing:3px}.nav-device-code a{display:flex;justify-content:center;align-items:center;gap:5px;color:var(--primary);font-size:11px}.nav-security-note{display:flex;gap:7px;margin-top:16px!important;padding:10px;background:var(--surface-2);border-radius:var(--radius-sm)}.nav-authorized{display:flex;align-items:center;gap:8px;color:var(--success);font-size:12px}.nav-file-pick{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--line);border-radius:var(--radius-sm);font-size:10px;color:var(--text);cursor:pointer;margin-bottom:12px}.nav-file-pick input{display:none}.nav-modal-body textarea{display:block;min-height:120px;font-family:monospace}.nav-radio-row{display:flex;gap:18px;margin-top:12px}.nav-radio-row label{font-size:10px;color:var(--muted);display:flex;align-items:center;gap:5px}.nav-add-category{display:flex;gap:8px;margin-bottom:12px}.nav-add-category input{flex:1}.nav-category-edit{display:flex;align-items:center;gap:7px;padding:8px 0;border-bottom:1px solid var(--line);font-size:11px}.nav-category-edit strong{font-weight:600}.nav-category-edit input{flex:1;width:auto}.nav-category-edit select{max-width:90px;border:1px solid var(--line);border-radius:var(--radius-sm);padding:5px;background:var(--surface-2);color:var(--text);font-size:9px}.nav-category-count{margin-left:auto;color:var(--muted);font-size:9px;white-space:nowrap}.spin{animation:nav-spin 1.3s linear infinite}@keyframes nav-spin{to{transform:rotate(360deg)}}@media(max-width:900px){.nav-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nav-layout{grid-template-columns:175px minmax(0,1fr);gap:13px}.nav-page{padding-left:20px;padding-right:20px}}@media(max-width:650px){.nav-page{padding:22px 13px 95px}.nav-heading{align-items:flex-start;flex-direction:column}.nav-heading h1{font-size:25px}.nav-heading-actions{width:100%}.nav-heading-actions .nav-btn{flex:1}.nav-summary{gap:13px;padding:12px;flex-wrap:wrap}.nav-summary strong{font-size:17px}.nav-summary .nav-summary-status{width:100%;margin-left:0;padding-top:8px;border-top:1px solid var(--line)}.nav-layout{display:block}.nav-sidebar{position:static;display:flex;gap:4px;overflow-x:auto;padding:8px;margin-bottom:12px;white-space:nowrap}.nav-side-title,.nav-side-divider,.nav-tags-block,.nav-manage-cats{display:none!important}.nav-sidebar>button{width:auto;flex-shrink:0;padding:8px 10px}.nav-sidebar>button>span:last-child{margin-left:0}.nav-toolbar{align-items:stretch;flex-direction:column}.nav-toolbar-actions{justify-content:space-between}.nav-search{height:40px}.nav-card-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.website-card{padding:11px}.website-name{font-size:12px}.website-description{font-size:9px}.website-list-row{gap:8px;padding:10px}.website-list-category{display:none}.website-list-main p{max-width:170px}.website-list-row>.website-favorite{margin-left:auto}.nav-drawer{width:100%}.nav-modal-backdrop{padding:10px}.nav-form{padding:14px}.nav-form-row{grid-template-columns:1fr}.nav-save-bar{width:calc(100% - 24px);justify-content:space-between;bottom:10px}.nav-save-bar>span{font-size:10px}.nav-save-bar .nav-btn{padding:9px 11px}.nav-radio-row{flex-direction:column;gap:9px}}
</style>