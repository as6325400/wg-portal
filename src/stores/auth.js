import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api/auth.js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const checked = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username, password) {
    const data = await authApi.login(username, password)
    user.value = data.user
    return data
  }

  async function logout() {
    await authApi.logout()
    user.value = null
  }

  async function fetchMe() {
    try {
      const data = await authApi.me()
      user.value = data.user
    } catch {
      user.value = null
    } finally {
      checked.value = true
    }
  }

  return { user, checked, isAuthenticated, isAdmin, login, logout, fetchMe }
})
