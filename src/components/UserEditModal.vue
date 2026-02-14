<template>
  <div class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
  <div class="fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-700">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-neutral-100">{{ t('userEdit.title', { name: user.username }) }}</h3>
    <p class="mb-5 mt-1 text-sm text-slate-400 dark:text-neutral-400">{{ t('userEdit.description') }}</p>

    <form @submit.prevent="handleSave">
      <div class="mb-4">
        <label class="mb-1 block text-sm text-slate-500 dark:text-neutral-300">{{ t('userEdit.maxDevices') }}</label>
        <input
          v-model.number="maxDevices"
          type="number"
          min="0"
          max="100"
          class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition focus:border-indigo-500 focus:bg-white focus:outline-0 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
        />
      </div>

      <div class="mb-4 flex items-center justify-between">
        <label class="text-sm text-slate-500 dark:text-neutral-300">{{ t('userEdit.enabled') }}</label>
        <button
          type="button"
          @click="enabled = !enabled"
          class="relative flex h-6 w-10 cursor-pointer rounded-full shadow-sm transition-colors"
          :class="enabled ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-neutral-500'"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-100"
            :class="enabled ? 'translate-x-[20px]' : 'translate-x-1'"
            style="margin-top: 4px;"
          />
        </button>
      </div>

      <div v-if="userDevices.length > 0" class="mb-4">
        <label class="mb-1 block text-sm text-slate-500 dark:text-neutral-300">{{ t('userEdit.devices', { n: userDevices.length }) }}</label>
        <div class="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-neutral-600">
          <div
            v-for="d in userDevices"
            :key="d.id"
            class="flex justify-between border-b border-gray-100 px-3 py-2 text-xs last:border-b-0 dark:border-neutral-600"
          >
            <span class="text-gray-700 dark:text-neutral-200">{{ d.name }}</span>
            <span class="font-mono text-slate-400 dark:text-neutral-400">{{ d.vpn_ip }}</span>
          </div>
        </div>
      </div>

      <div v-if="error" class="mb-4 text-sm text-red-500">{{ error }}</div>

      <div class="mt-6 flex justify-end gap-2">
        <button
          type="button"
          @click="$emit('close')"
          class="rounded-lg px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-600"
        >
          {{ t('cancel') }}
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50"
        >
          {{ saving ? t('saving') : t('save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api/admin.js'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  user: Object,
})

const emit = defineEmits(['close', 'updated'])

const maxDevices = ref(props.user.max_devices)
const enabled = ref(!!props.user.enabled)
const userDevices = ref([])
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    const data = await adminApi.getUserDevices(props.user.id)
    userDevices.value = data.devices
  } catch {
    // ignore
  }
})

async function handleSave() {
  error.value = ''
  saving.value = true
  try {
    await adminApi.updateUser(props.user.id, {
      max_devices: maxDevices.value,
      enabled: enabled.value,
    })
    emit('updated')
  } catch (err) {
    error.value = err.response?.data?.error || t('userEdit.updateFailed')
  } finally {
    saving.value = false
  }
}
</script>
