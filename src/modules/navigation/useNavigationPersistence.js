import { saveNavigationData } from './github'

export function useNavigationPersistence({
  data,
  baseline,
  admin,
  busy,
  saveConflict,
  snapshot,
  onMessage,
  onError,
  onUnauthorized,
}) {
  async function save() {
    if (!admin.value) {
      onUnauthorized?.()
      return null
    }

    busy.value = true
    onMessage('')
    try {
      const payload = { ...data.value, updatedAt: Date.now() }
      if (!baseline.value) {
        throw new Error('当前没有可信的数据基线，请先重新加载 GitHub 最新数据。')
      }
      const sha = await saveNavigationData(payload, baseline.value)
      data.value = payload
      baseline.value = snapshot()
      window.dispatchEvent(new CustomEvent('mot-navigation-data-updated', { detail: payload }))
      onMessage(`已保存到 GitHub。Commit：${sha.slice(0, 7)}`)
      return sha
    } catch (error) {
      if (error.code === 'STALE_BASELINE' || error.code === 'WRITE_CONFLICT') {
        onError('远端数据已发生变化，本次保存已取消。本地修改仍保留在当前页面；请先导出待保存数据，再重新加载远端数据并重新应用修改。')
        saveConflict.value = true
      } else {
        onError(error.message || '保存失败')
      }
      return null
    } finally {
      busy.value = false
    }
  }

  return { save }
}
