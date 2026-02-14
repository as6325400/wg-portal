<template>
  <div class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
  <div class="fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-700">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-neutral-100">{{ t('create.title') }}</h3>
    <p class="mb-5 mt-1 text-sm text-slate-400 dark:text-neutral-400">{{ t('create.description') }}</p>
    <form @submit.prevent="handleCreate">
      <input
        v-model="name"
        type="text"
        :placeholder="t('create.placeholder')"
        autofocus
        :disabled="loading"
        class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 transition focus:border-indigo-500 focus:bg-white focus:outline-0 focus:ring-2 focus:ring-indigo-500/20 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder:text-neutral-400"
      />
      <div v-if="error" class="mt-3 text-sm text-red-500">{{ error }}</div>
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
          :disabled="loading"
          class="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600 disabled:opacity-50"
        >
          {{ loading ? t('create.submitting') : t('create.submit') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { devicesApi } from '../api/devices.js'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()
const emit = defineEmits(['close', 'created'])

const name = ref('')
const error = ref('')
const loading = ref(false)

async function handleCreate() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = t('create.nameRequired')
    return
  }
  loading.value = true
  try {
    const data = await devicesApi.create(name.value.trim())
    emit('created', data.device)
  } catch (err) {
    error.value = err.response?.data?.error || t('create.failed')
  } finally {
    loading.value = false
  }
}
</script>
