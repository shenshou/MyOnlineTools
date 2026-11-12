import { ref } from 'vue'
import {
  clearAccessToken,
  restoreAdminSession,
  setAccessToken,
  verifyAdminToken,
} from './github'

export function useNavigationAdmin() {
  const admin = ref(false)
  const tokenInput = ref('')
  const busy = ref(false)

  async function restore() {
    try {
      const account = await restoreAdminSession()
      admin.value = Boolean(account)
      return account
    } catch (error) {
      admin.value = false
      throw error
    }
  }

  async function login() {
    const token = tokenInput.value.trim()
    if (!token) throw new Error('请填写 Fine-grained Personal Access Token')
    busy.value = true
    try {
      const account = await verifyAdminToken(token)
      setAccessToken(token)
      admin.value = true
      tokenInput.value = ''
      return account
    } finally {
      busy.value = false
    }
  }

  function logout() {
    clearAccessToken()
    admin.value = false
    tokenInput.value = ''
  }

  return { admin, tokenInput, busy, restore, login, logout }
}
