import { ref } from 'vue'
import { normalizeNavigationData } from './validation'
import { mergeNavigationData } from './operations'
import {
  buildWebsiteRecord,
  createCategory,
  renameCategory as renameCategoryData,
  removeCategory as removeCategoryData,
} from './editor'

function emptyForm() {
  return { name: '', url: '', favicon: '', description: '', notes: '', categoryId: 'other', tagsText: '', favorite: false }
}

export function useNavigationEditor({
  data,
  admin,
  showAdmin,
  selectedCategory,
  selectedWebsite,
  confirm,
  onMessage,
  onError,
}) {
  const showForm = ref(false)
  const editingId = ref(null)
  const showImport = ref(false)
  const showCategoryManager = ref(false)
  const form = ref(emptyForm())
  const importText = ref('')
  const importMode = ref('merge')
  const newCategory = ref('')
  const categoryEdit = ref(null)

  function requireAdmin() {
    if (admin.value) return true
    showAdmin.value = true
    return false
  }

  function openAdd() {
    if (!requireAdmin()) return
    editingId.value = null
    form.value = {
      ...emptyForm(),
      categoryId: selectedCategory.value !== 'all'
        ? selectedCategory.value
        : (data.value.categories[0]?.id || 'other'),
    }
    showForm.value = true
  }

  function openEdit(item) {
    if (!requireAdmin()) return
    editingId.value = item.id
    form.value = { ...item, tagsText: (item.tags || []).join(', ') }
    selectedWebsite.value = null
    showForm.value = true
  }

  function saveForm() {
    if (!requireAdmin()) return
    try {
      const record = buildWebsiteRecord(
        form.value,
        data.value.websites,
        editingId.value,
        Date.now(),
        crypto.randomUUID(),
      )
      const index = data.value.websites.findIndex(website => website.id === record.id)
      if (index >= 0) data.value.websites[index] = record
      else data.value.websites.push(record)
      showForm.value = false
      onMessage('更改已暂存在当前页面，请点击「保存到 GitHub」同步。')
    } catch (error) {
      onError(error.message || '请检查输入内容')
    }
  }

  async function deleteWebsite(item) {
    if (!requireAdmin()) return
    const ok = await confirm({
      title: '删除网址',
      message: '确定删除「' + item.name + '」吗？此操作将在保存后写入仓库。',
      confirmText: '删除',
      tone: 'danger',
    })
    if (!ok) return
    data.value.websites = data.value.websites.filter(website => website.id !== item.id)
    selectedWebsite.value = null
    onMessage('已删除，尚未同步到 GitHub。')
  }

  function moveWebsite(item, direction) {
    if (!requireAdmin()) return
    const ordered = [...data.value.websites].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
    const index = ordered.findIndex(website => website.id === item.id)
    const target = ordered[index + direction]
    if (!target) return
    const order = item.sortOrder
    item.sortOrder = target.sortOrder
    target.sortOrder = order
    item.updatedAt = Date.now()
    target.updatedAt = Date.now()
  }

  function moveCategory(category, direction) {
    if (!requireAdmin()) return
    const ordered = [...data.value.categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = ordered.findIndex(item => item.id === category.id)
    const target = ordered[index + direction]
    if (!target) return
    const order = category.sortOrder
    category.sortOrder = target.sortOrder
    target.sortOrder = order
  }

  async function importData() {
    if (!requireAdmin()) return
    try {
      const incoming = normalizeNavigationData(JSON.parse(importText.value))
      if (importMode.value === 'replace') {
        const ok = await confirm({
          title: '覆盖导入数据',
          message: '覆盖导入将替换当前全部网址和分类，确定继续吗？',
          confirmText: '覆盖导入',
          tone: 'danger',
        })
        if (!ok) return
        data.value = {
          schemaVersion: 1,
          categories: incoming.categories,
          websites: incoming.websites,
          updatedAt: Date.now(),
        }
      } else {
        const result = mergeNavigationData(data.value, incoming)
        data.value = result.data
        onMessage('合并完成：新增 ' + result.added + ' 条，更新 ' + result.updated + ' 条。尚未保存到 GitHub。')
      }
      showImport.value = false
      importText.value = ''
      if (importMode.value === 'replace') onMessage('覆盖导入完成，尚未保存到 GitHub。')
    } catch (error) {
      onError(error.message || '导入失败')
    }
  }

  function addCategory() {
    if (!requireAdmin()) return
    try {
      data.value.categories = createCategory(
        data.value.categories,
        newCategory.value,
        'custom-' + crypto.randomUUID(),
      )
      newCategory.value = ''
      onMessage('分类已添加，尚未同步到 GitHub。')
    } catch (error) {
      onError(error.message)
    }
  }

  function renameCategory(category) {
    if (!requireAdmin()) return
    try {
      data.value.categories = renameCategoryData(
        data.value.categories,
        category.id,
        categoryEdit.value?.name,
      )
      categoryEdit.value = null
      onMessage('分类名称已修改，尚未同步到 GitHub。')
    } catch (error) {
      onError(error.message)
    }
  }

  async function removeCategory(category) {
    if (!requireAdmin()) return
    if (data.value.categories.length <= 1) {
      onError('至少保留一个分类')
      return
    }
    const target = data.value.categories.find(item => item.id !== category.id)
    const ok = await confirm({
      title: '删除分类',
      message: '删除「' + category.name + '」并将其中网址移动到「' + target.name + '」？',
      confirmText: '删除分类',
      tone: 'danger',
    })
    if (!ok) return
    try {
      data.value = removeCategoryData(data.value, category.id)
      if (selectedCategory.value === category.id) selectedCategory.value = 'all'
      onMessage('分类已删除，相关网址已移动到其他分类，尚未同步到 GitHub。')
    } catch (error) {
      onError(error.message)
    }
  }

  function openImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      importText.value = String(reader.result || '')
      showImport.value = true
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  return {
    showForm, editingId, showImport, showCategoryManager, form, importText,
    importMode, newCategory, categoryEdit,
    openAdd, openEdit, saveForm, deleteWebsite, moveWebsite, moveCategory,
    importData, addCategory, renameCategory, removeCategory, openImportFile,
  }
}
