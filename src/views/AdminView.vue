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
                <span v-if="user.auth_source === 'ldap'" class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">LDAP</span>
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
        <div v-else>
          <!-- Toolbar -->
          <div class="flex items-center gap-3 mb-2">
            <button
              @click="selectAll"
              class="text-xs text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
            >{{ t('admin.selectAll') }}</button>
            <button
              @click="deselectAll"
              class="text-xs text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 font-medium"
            >{{ t('admin.deselectAll') }}</button>
            <span class="ml-auto text-xs text-slate-400 dark:text-neutral-500">
              {{ allowedGroups.length === 0 && allowedUsers.length === 0
                ? t('admin.noRestriction')
                : t('admin.selectedCount', { covered: coveredUserCount }) }}
            </span>
          </div>

          <!-- Two-level accordion -->
          <div class="rounded-lg border border-slate-200 dark:border-neutral-600 overflow-hidden max-h-96 overflow-y-auto">
            <div v-for="group in visibleGroups" :key="group.name">
              <!-- Group header row -->
              <div
                class="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-neutral-600 transition"
                :class="allowedGroups.includes(group.name)
                  ? 'bg-indigo-50 dark:bg-indigo-500/10'
                  : 'hover:bg-slate-50 dark:hover:bg-neutral-600/50'"
              >
                <label class="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                  <input
                    type="checkbox"
                    :checked="allowedGroups.includes(group.name)"
                    @change="toggleGroup(group.name)"
                    class="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 dark:border-neutral-500 dark:bg-neutral-700"
                  />
                  <svg class="h-4 w-4 text-slate-400 dark:text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span class="text-sm truncate" :class="allowedGroups.includes(group.name) ? 'font-medium text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-neutral-200'">
                    {{ group.name }}
                  </span>
                  <span v-if="group.members.length > 0" class="ml-1 text-xs text-slate-400 dark:text-neutral-500 shrink-0">
                    ({{ group.members.length }})
                  </span>
                </label>
                <!-- Expand button -->
                <button
                  v-if="group.members.length > 0"
                  @click="toggleExpand(group.name)"
                  class="p-1 text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition shrink-0"
                >
                  <svg class="w-4 h-4 transition-transform" :class="expandedGroups.has(group.name) ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <!-- Members (expanded) -->
              <div v-if="expandedGroups.has(group.name) && group.members.length > 0">
                <div
                  v-for="member in group.members"
                  :key="member"
                  class="flex items-center gap-3 pl-8 pr-4 py-2 border-b border-slate-50 last:border-b-0 dark:border-neutral-700"
                  :class="isMemberAllowed(member) ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''"
                >
                  <label class="flex items-center gap-3 flex-1 min-w-0" :class="allowedGroups.includes(group.name) ? 'opacity-60' : 'cursor-pointer'">
                    <input
                      type="checkbox"
                      :checked="isMemberAllowed(member)"
                      :disabled="allowedGroups.includes(group.name)"
                      @change="toggleUser(member)"
                      class="h-3.5 w-3.5 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500 dark:border-neutral-500 dark:bg-neutral-700 disabled:opacity-50"
                    />
                    <svg class="h-3.5 w-3.5 text-slate-300 dark:text-neutral-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span class="text-xs" :class="isMemberAllowed(member) ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-500 dark:text-neutral-400'">
                      {{ member }}
                    </span>
                  </label>
                  <span v-if="isMemberAllowed(member)" class="shrink-0">
                    <svg class="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { adminApi } from '../api/admin.js'
import { useI18n } from '../i18n/index.js'
import AppLayout from '../components/AppLayout.vue'
import UserEditModal from '../components/UserEditModal.vue'

const { t } = useI18n()

const users = ref([])
const loadingUsers = ref(true)
const editUser = ref(null)

const groupsWithMembers = ref([])
const allowedGroups = ref([])
const allowedUsers = ref([])
const expandedGroups = reactive(new Set())
const loadingGroups = ref(true)
const savingSettings = ref(false)
const settingsMsg = ref('')
const settingsFailed = ref(false)

// Only show groups that have members
const visibleGroups = computed(() =>
  groupsWithMembers.value.filter(g => g.members.length > 0)
)

// Count unique users covered by selected groups + individual users
const coveredUserCount = computed(() => {
  const covered = new Set(allowedUsers.value)
  for (const g of groupsWithMembers.value) {
    if (allowedGroups.value.includes(g.name)) {
      g.members.forEach(m => covered.add(m))
    }
  }
  return covered.size
})

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
    groupsWithMembers.value = data.groups
  } catch {
    // ignore
  }
}

async function fetchSettings() {
  try {
    const data = await adminApi.getSettings()
    allowedGroups.value = data.allowed_groups
    allowedUsers.value = data.allowed_users || []
  } catch {
    // ignore
  } finally {
    loadingGroups.value = false
  }
}

function selectAll() {
  allowedGroups.value = visibleGroups.value.map(g => g.name)
}

function deselectAll() {
  allowedGroups.value = []
  allowedUsers.value = []
}

function toggleGroup(group) {
  const idx = allowedGroups.value.indexOf(group)
  if (idx >= 0) {
    allowedGroups.value.splice(idx, 1)
  } else {
    allowedGroups.value.push(group)
  }
}

function toggleUser(username) {
  const idx = allowedUsers.value.indexOf(username)
  if (idx >= 0) {
    allowedUsers.value.splice(idx, 1)
  } else {
    allowedUsers.value.push(username)
  }
}

function toggleExpand(groupName) {
  if (expandedGroups.has(groupName)) {
    expandedGroups.delete(groupName)
  } else {
    expandedGroups.add(groupName)
  }
}

function isMemberAllowed(username) {
  if (allowedGroups.value.length === 0 && allowedUsers.value.length === 0) return true
  // Check if user is individually allowed
  if (allowedUsers.value.includes(username)) return true
  // Check if the user is in any allowed group
  return groupsWithMembers.value.some(g =>
    allowedGroups.value.includes(g.name) && g.members.includes(username)
  )
}

async function saveSettings() {
  savingSettings.value = true
  settingsMsg.value = ''
  settingsFailed.value = false
  try {
    await adminApi.updateSettings({ allowed_groups: allowedGroups.value, allowed_users: allowedUsers.value })
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
