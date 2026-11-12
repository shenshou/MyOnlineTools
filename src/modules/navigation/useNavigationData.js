import { computed, ref } from 'vue'
import { defaultNavigationData } from './defaultData'
import { normalizeNavigationData } from './validation'
import { fetchNavigationData } from './github'

const NAVIGATION_CACHE_KEY = 'mot-navigation-data-cache'

function isValidNavigationData(value) {
  try {
    normalizeNavigationData(value)
    return true
  } catch {
    return false
  }
}

export function useNavigationData() {
  const data = ref(structuredClone(defaultNavigationData))
  const baseline = ref('')
  const loading = ref(true)
  const loadError = ref('')

  function snapshot() {
    return JSON.stringify(data.value)
  }

  const dirty = computed(() => snapshot() !== baseline.value)

  async function loadData() {
    loading.value = true
    loadError.value = ''
    try {
      const remote = await fetchNavigationData()
      if (!isValidNavigationData(remote)) throw new Error('网址数据格式不正确')
      data.value = normalizeNavigationData(remote)
      baseline.value = snapshot()
      try {
        const serialized = JSON.stringify(remote)
        if (sessionStorage.getItem(NAVIGATION_CACHE_KEY) !== serialized) {
          sessionStorage.setItem(NAVIGATION_CACHE_KEY, serialized)
        }
      } catch {
        // Cache storage is optional; it must not prevent a successful remote load.
      }
    } catch (error) {
      // Preserve the last successful tab-scoped snapshot during temporary network/API failures.
      try {
        const cached = JSON.parse(sessionStorage.getItem(NAVIGATION_CACHE_KEY) || 'null')
        if (isValidNavigationData(cached)) {
          data.value = normalizeNavigationData(cached)
          baseline.value = snapshot()
          loadError.value = `暂时无法读取 GitHub 最新数据，当前显示本标签页上次成功读取的数据。原因：${error.message}`
        } else {
          loadError.value = `无法读取 GitHub 网址数据：${error.message}`
        }
      } catch {
        loadError.value = `无法读取 GitHub 网址数据：${error.message}`
      }
    } finally {
      loading.value = false
    }
  }

  return { data, baseline, loading, loadError, dirty, snapshot, loadData }
}
