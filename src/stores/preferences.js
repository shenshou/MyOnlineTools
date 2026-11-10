import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
export const usePreferences = defineStore('preferences', () => {
  const favorites = ref(JSON.parse(localStorage.getItem('mot-favorites') || '[]'))
  const recent = ref(JSON.parse(localStorage.getItem('mot-recent') || '[]'))
  const theme = ref(localStorage.getItem('mot-theme') || 'light')
  watch(favorites, v => localStorage.setItem('mot-favorites', JSON.stringify(v)), { deep:true })
  watch(recent, v => localStorage.setItem('mot-recent', JSON.stringify(v)), { deep:true })
  watch(theme, v => { localStorage.setItem('mot-theme', v); document.documentElement.dataset.theme = v }, { immediate:true })
  function toggleFavorite(id) { favorites.value = favorites.value.includes(id) ? favorites.value.filter(x => x !== id) : [...favorites.value, id] }
  function touch(id) { recent.value = [id, ...recent.value.filter(x => x !== id)].slice(0, 8) }
  return { favorites, recent, theme, toggleFavorite, touch }
})