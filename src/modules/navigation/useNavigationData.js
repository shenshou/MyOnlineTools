import { computed, ref } from 'vue'
import { defaultNavigationData } from './defaultData'
import { normalizeNavigationData } from './validation'
import { fetchNavigationData } from './github'
import { readNavigationCache, writeNavigationCache } from './cache'

function normalizeCachedData(value) {
  try {
    return value ? normalizeNavigationData(value) : null
  } catch {
    return null
  }
}

export function useNavigationData() {
  const cachedData = normalizeCachedData(readNavigationCache())
  const data = ref(cachedData || structuredClone(defaultNavigationData))
  const baseline = ref(JSON.stringify(data.value))
  const loading = ref(!cachedData)
  const refreshing = ref(false)
  const hasCache = ref(Boolean(cachedData))
  const loadError = ref('')

  function snapshot() {
    return JSON.stringify(data.value)
  }

  const dirty = computed(() => snapshot() !== baseline.value)

  async function refreshData() {
    if (refreshing.value) return
    if (dirty.value) {
      loadError.value = '当前有尚未保存的修改。请先保存或导出修改，再更新远端数据，以免覆盖本地编辑。'
      return
    }

    refreshing.value = true
    if (!hasCache.value) loading.value = true
    loadError.value = ''

    try {
      const remote = await fetchNavigationData()
      const normalized = normalizeNavigationData(remote)
      data.value = normalized
      baseline.value = snapshot()
      hasCache.value = true
      writeNavigationCache(remote)
    } catch (error) {
      loadError.value = hasCache.value
        ? `更新失败，继续显示上次缓存的网址数据。原因：${error.message}`
        : `无法读取 GitHub 网址数据：${error.message}`
    } finally {
      loading.value = false
      refreshing.value = false
    }
  }

  async function loadData() {
    if (hasCache.value) return data.value
    await refreshData()
    return data.value
  }

  return { data, baseline, loading, refreshing, loadError, dirty, snapshot, loadData, refreshData }
}
