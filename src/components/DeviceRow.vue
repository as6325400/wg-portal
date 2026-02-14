<template>
  <div class="border-b border-slate-100 last:border-b-0 dark:border-neutral-600">
    <div class="flex flex-col justify-between gap-3 px-4 py-3.5 sm:flex-row md:py-4">
      <!-- Left: Avatar + Info + Traffic -->
      <div class="flex w-full items-center gap-3 md:gap-4">
        <!-- Avatar with status dot -->
        <div class="relative flex-shrink-0">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-neutral-600">
            <svg class="h-5 w-5 text-slate-400 dark:text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span v-if="isOnline" class="absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-neutral-700"></span>
        </div>

        <!-- Client info -->
        <div class="flex w-full flex-col gap-0.5">
          <span class="text-sm font-medium text-gray-700 dark:text-neutral-200 md:text-base">{{ device.name }}</span>
          <div class="flex flex-col gap-0.5 md:flex-row md:gap-3">
            <span class="font-mono text-xs text-slate-400 dark:text-neutral-400">{{ device.vpn_ip }}</span>
            <span v-if="device.last_handshake" class="text-xs" :class="isOnline ? 'text-green-500' : 'text-slate-400 dark:text-neutral-500'">
              {{ isOnline ? t('device.online') : timeAgo(device.last_handshake) }}
            </span>
          </div>
        </div>

        <!-- Transfer -->
        <div class="flex shrink-0 items-center gap-3 text-xs text-slate-400 dark:text-neutral-400">
          <div class="flex items-center gap-1 min-w-20 justify-end">
            <svg class="h-3 w-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            <span>{{ formatBytes(device.rx_bytes) }}</span>
          </div>
          <div class="flex items-center gap-1 min-w-20 justify-end">
            <svg class="h-3 w-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{{ formatBytes(device.tx_bytes) }}</span>
          </div>
        </div>
      </div>

      <!-- Right: Action buttons -->
      <div class="flex items-center justify-end gap-1">
        <button
          @click="$emit('showQr', device)"
          class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-indigo-400"
          :title="t('device.qrCode')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zm-11 11h7v7H3v-7zm14 3h.01M17 17h.01M14 14h3v3h-3v-3zm3 3h3v3h-3v-3z" />
          </svg>
        </button>

        <button
          @click="downloadConfig"
          class="rounded-lg p-2 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-indigo-400"
          :title="t('device.downloadConfig')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        <button
          @click="handleDelete"
          :disabled="deleting"
          class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-red-400"
          :title="t('device.delete')"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { devicesApi } from '../api/devices.js'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  device: Object,
})

const emit = defineEmits(['deleted', 'showQr'])
const deleting = ref(false)

const isOnline = computed(() => {
  if (!props.device.last_handshake) return false
  return Date.now() - new Date(props.device.last_handshake).getTime() < 180000
})

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('device.justNow')
  if (mins < 60) return t('device.mAgo', { n: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('device.hAgo', { n: hours })
  const days = Math.floor(hours / 24)
  return t('device.dAgo', { n: days })
}

async function downloadConfig() {
  try {
    const blob = await devicesApi.getConfig(props.device.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.device.name}.conf`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    alert(t('device.downloadFailed'))
  }
}

async function handleDelete() {
  if (!confirm(t('device.confirmDelete', { name: props.device.name }))) return
  deleting.value = true
  try {
    await devicesApi.remove(props.device.id)
    emit('deleted', props.device.id)
  } catch {
    alert(t('device.deleteFailed'))
  } finally {
    deleting.value = false
  }
}
</script>
