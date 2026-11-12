import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

function readStorage(key, fallback, validate) {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const value = JSON.parse(raw)
    return validate(value) ? value : fallback
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch { /* Storage may be disabled or full; in-memory preferences still work. */ }
}

export const usePreferences = defineStore('preferences', () => {
  const favorites = ref(readStorage('mot-favorites', [], value => Array.isArray(value) && value.every(item => typeof item === 'string')))
  const recent = ref(readStorage('mot-recent', [], value => Array.isArray(value) && value.every(item => typeof item === 'string')))
  const theme = ref(readStorage('mot-theme', 'light', value => value === 'light' || value === 'dark'))

  watch(favorites, value => writeStorage('mot-favorites', value), { deep: true })
  watch(recent, value => writeStorage('mot-recent', value), { deep: true })
  watch(theme, value => {
    try { document.documentElement.dataset.theme = value } catch { /* Non-browser context. */ }
    writeStorage('mot-theme', value)
  }, { immediate: true })

  function toggleFavorite(id) {
    favorites.value = favorites.value.includes(id)
      ? favorites.value.filter(item => item !== id)
      : [...favorites.value, id]
  }

  function touch(id) {
    recent.value = [id, ...recent.value.filter(item => item !== id)].slice(0, 8)
  }

  return { favorites, recent, theme, toggleFavorite, touch }
})
