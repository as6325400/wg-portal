<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-neutral-900 dark:to-neutral-800">
    <form
      @submit.prevent="handleLogin"
      class="mx-auto flex w-80 flex-col gap-5 rounded-xl bg-white p-8 shadow-lg dark:bg-neutral-700"
    >
      <!-- Avatar -->
      <div class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md">
        <svg class="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>

      <div class="text-center">
        <h1 class="text-xl font-semibold text-gray-800 dark:text-neutral-100">wg-portal</h1>
        <p class="mt-1 text-xs text-gray-400 dark:text-neutral-400">{{ t('login.subtitle') }}</p>
      </div>

      <input
        v-model="username"
        type="text"
        :placeholder="t('login.username')"
        autocomplete="username"
        :disabled="loading"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition focus:border-indigo-500 focus:bg-white focus:outline-0 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-400 dark:focus:border-indigo-400"
      />
      <input
        v-model="password"
        type="password"
        :placeholder="t('login.password')"
        autocomplete="current-password"
        :disabled="loading"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition focus:border-indigo-500 focus:bg-white focus:outline-0 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-400 dark:focus:border-indigo-400"
      />

      <div v-if="error" class="text-red-500 text-xs text-center">{{ error }}</div>

      <button
        type="submit"
        :disabled="loading || !username || !password"
        class="rounded-lg bg-indigo-500 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600 hover:shadow disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500"
      >
        {{ loading ? t('login.submitting') : t('login.submit') }}
      </button>
    </form>

    <!-- Language menu on login page -->
    <div class="mt-4">
      <LanguageMenu variant="ghost" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useI18n } from '../i18n/index.js'
import LanguageMenu from '../components/LanguageMenu.vue'

const { t } = useI18n()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(username.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || t('login.failed')
  } finally {
    loading.value = false
  }
}
</script>
