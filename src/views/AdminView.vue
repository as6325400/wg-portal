<template>
  <AppLayout>
    <!-- Users Panel -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-600 dark:bg-neutral-700 mb-6">
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-neutral-600">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-neutral-100">{{ t('admin.users') }}</h2>
      </div>
      <div v-if="loadingUsers" class="p-8 text-center text-slate-400 dark:text-neutral-400">{{ t('loading') }}</div>
      <div v-else>
        <div
          v-for="user in users"
          :key="user.id"
          class="flex items-center justify-between border-b border-slate-100 px-5 py-3 last:border-b-0 dark:border-neutral-600"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-600">
              <svg class="h-5 w-5 text-slate-400 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-700 dark:text-neutral-200">{{ user.username }}</span>
                <span v-if="user.role === 'admin'" class="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">{{ t('admin.admin') }}</span>
                <span v-if="!user.enabled" class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-neutral-600 dark:text-neutral-400">{{ t('admin.disabled') }}</span>
              </div>
              <span class="text-xs text-slate-400 dark:text-neutral-400">{{ user.device_count }} / {{ user.max_devices }} {{ t('admin.devices') }}</span>
            </div>
          </div>
          <button
            @click="editUser = user"
            class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-indigo-400"
            :title="t('admin.edit')"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Allowed Groups Panel -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-600 dark:bg-neutral-700">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-neutral-600">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-neutral-100">{{ t('admin.allowedGroups') }}</h2>
      </div>
      <div class="p-5">
        <p class="mb-4 text-sm text-slate-400 dark:text-neutral-400">
          {{ t('admin.groupsDescription') }}
        </p>

        <div v-if="loadingGroups" class="text-slate-400 dark:text-neutral-400 text-sm">{{ t('admin.loadingGroups') }}</div>
        <div v-else class="flex flex-wrap gap-2">
          <!-- All chip -->
          <button
            @click="toggleAll"
            class="rounded-full px-3 py-1 text-xs font-medium transition border"
            :class="allowedGroups.length === 0
              ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 dark:border-neutral-500 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:border-indigo-400'"
          >
            {{ t('admin.all') }}
          </button>

          <!-- Group chips -->
          <button
            v-for="group in systemGroups"
            :key="group"
            @click="toggleGroup(group)"
            class="rounded-full px-3 py-1 text-xs font-medium transition border"
            :class="allowedGroups.includes(group)
              ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-indigo-300 dark:border-neutral-500 dark:bg-neutral-600 dark:text-neutral-300 dark:hover:border-indigo-400'"
          >
            {{ group }}
          </button>
        </div>

        <div class="mt-5 flex items-center gap-3">
          <button
            @click="saveSettings"
            :disabled="savingSettings"
            class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50"
          >
            {{ savingSettings ? t('saving') : t('save') }}
          </button>
          <p v-if="settingsMsg" class="text-xs" :class="settingsFailed ? 'text-red-500' : 'text-green-600 dark:text-green-400'">{{ settingsMsg }}</p>
        </div>
      </div>
    </div>

    <UserEditModal v-if="editUser" :user="editUser" @close="editUser = null" @updated="onUserUpdated" />
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api/admin.js'
import { useI18n } from '../i18n/index.js'
import AppLayout from '../components/AppLayout.vue'
import UserEditModal from '../components/UserEditModal.vue'

const { t } = useI18n()

const users = ref([])
const loadingUsers = ref(true)
const editUser = ref(null)

const systemGroups = ref([])
const allowedGroups = ref([])
const loadingGroups = ref(true)
const savingSettings = ref(false)
const settingsMsg = ref('')
const settingsFailed = ref(false)

async function fetchUsers() {
  try {
    const data = await adminApi.listUsers()
    users.value = data.users
  } catch {
    // handled by interceptor
  } finally {
    loadingUsers.value = false
  }
}

async function fetchGroups() {
  try {
    const data = await adminApi.listGroups()
    systemGroups.value = data.groups
  } catch {
    // ignore
  }
}

async function fetchSettings() {
  try {
    const data = await adminApi.getSettings()
    allowedGroups.value = data.allowed_groups
  } catch {
    // ignore
  } finally {
    loadingGroups.value = false
  }
}

function toggleAll() {
  allowedGroups.value = []
}

function toggleGroup(group) {
  const idx = allowedGroups.value.indexOf(group)
  if (idx >= 0) {
    allowedGroups.value.splice(idx, 1)
  } else {
    allowedGroups.value.push(group)
  }
}

async function saveSettings() {
  savingSettings.value = true
  settingsMsg.value = ''
  settingsFailed.value = false
  try {
    await adminApi.updateSettings({ allowed_groups: allowedGroups.value })
    settingsMsg.value = t('admin.settingsSaved')
    setTimeout(() => { settingsMsg.value = '' }, 3000)
  } catch {
    settingsFailed.value = true
    settingsMsg.value = t('admin.settingsFailed')
  } finally {
    savingSettings.value = false
  }
}

function onUserUpdated() {
  editUser.value = null
  fetchUsers()
}

onMounted(() => {
  fetchUsers()
  fetchGroups()
  fetchSettings()
})
</script>
