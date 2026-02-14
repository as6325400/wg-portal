<template>
  <div class="min-h-screen bg-slate-50 dark:bg-neutral-800">
    <!-- Header -->
    <header class="border-b border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
      <div class="container mx-auto max-w-3xl px-4">
        <div class="flex items-center justify-between py-4">
          <router-link to="/" class="text-xl font-bold text-gray-800 dark:text-neutral-100">
            <span class="text-indigo-500">wg</span>-portal
          </router-link>
          <div class="flex items-center gap-3">
            <!-- Language toggle -->
            <button
              @click="toggleLocale"
              class="rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
              :title="locale.locale === 'en' ? '切換中文' : 'Switch to English'"
            >
              {{ locale.locale === 'en' ? '中文' : 'EN' }}
            </button>

            <router-link
              v-if="authStore.isAdmin"
              to="/admin"
              class="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-indigo-400"
            >
              {{ t('nav.admin') }}
            </router-link>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-400 dark:text-neutral-500">{{ authStore.user?.username }}</span>
              <button
                @click="handleLogout"
                class="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                :title="t('nav.logout')"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="container mx-auto max-w-3xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js'
import { useRouter } from 'vue-router'
import { useI18n } from '../i18n/index.js'

const { t, locale, setLocale } = useI18n()
const authStore = useAuthStore()
const router = useRouter()

function toggleLocale() {
  setLocale(locale.locale === 'en' ? 'zh-TW' : 'en')
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
