<template>
  <div class="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm" @click="$emit('close')"></div>
  <div class="fixed left-1/2 top-1/2 z-[100] w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl dark:bg-neutral-700">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-neutral-100 text-center">{{ deviceName }}</h3>
    <p class="mb-5 mt-1 text-sm text-slate-400 dark:text-neutral-400 text-center">{{ t('qr.description') }}</p>

    <div v-if="loading" class="py-8 text-center text-slate-400 dark:text-neutral-400">{{ t('loading') }}</div>
    <div v-else-if="error" class="py-8 text-center text-red-500">{{ error }}</div>
    <img v-else :src="qrDataUrl" alt="QR Code" class="mx-auto rounded-lg" />

    <div class="mt-6 flex justify-end">
      <button
        @click="$emit('close')"
        class="rounded-lg px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-600"
      >
        {{ t('close') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { devicesApi } from '../api/devices.js'
import { useI18n } from '../i18n/index.js'

const { t } = useI18n()

const props = defineProps({
  deviceId: Number,
  deviceName: String,
})

defineEmits(['close'])

const qrDataUrl = ref('')
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const data = await devicesApi.getQrCode(props.deviceId)
    qrDataUrl.value = data.qrcode
  } catch {
    error.value = t('qr.loadFailed')
  } finally {
    loading.value = false
  }
})
</script>
