<template>
  <AppLayout>
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-600 dark:bg-neutral-700">
      <!-- Panel Header -->
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-neutral-600">
        <h2 class="text-lg font-semibold text-gray-800 dark:text-neutral-100">{{ t('dashboard.title') }}</h2>
        <button
          @click="showCreate = true"
          class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-600 hover:shadow"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          {{ t('dashboard.new') }}
        </button>
      </div>

      <!-- Client List -->
      <div v-if="loading" class="p-8 text-center text-slate-400 dark:text-neutral-400">{{ t('loading') }}</div>
      <div v-else-if="devices.length === 0" class="p-12 text-center text-slate-400 dark:text-neutral-400">
        {{ t('dashboard.empty') }}
      </div>
      <div v-else>
        <DeviceRow
          v-for="device in devices"
          :key="device.id"
          :device="device"
          @deleted="onDeleted"
          @showQr="onShowQr"
        />
      </div>
    </div>

    <DeviceCreateModal v-if="showCreate" @close="showCreate = false" @created="onCreated" />
    <QrCodeModal v-if="qrDevice" :deviceId="qrDevice.id" :deviceName="qrDevice.name" @close="qrDevice = null" />
  </AppLayout>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { devicesApi } from '../api/devices.js'
import { useI18n } from '../i18n/index.js'
import AppLayout from '../components/AppLayout.vue'
import DeviceRow from '../components/DeviceRow.vue'
import DeviceCreateModal from '../components/DeviceCreateModal.vue'
import QrCodeModal from '../components/QrCodeModal.vue'

const { t } = useI18n()
const devices = ref([])
const loading = ref(true)
const showCreate = ref(false)
const qrDevice = ref(null)

async function fetchDevices() {
  try {
    const data = await devicesApi.list()
    devices.value = data.devices
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

function onCreated() {
  showCreate.value = false
  fetchDevices()
}

function onDeleted(id) {
  devices.value = devices.value.filter(d => d.id !== id)
}

function onShowQr(device) {
  qrDevice.value = device
}

let interval
onMounted(() => {
  fetchDevices()
  interval = setInterval(fetchDevices, 30000)
})
onUnmounted(() => {
  clearInterval(interval)
})
</script>
