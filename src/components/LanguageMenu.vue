<template>
  <div class="relative" ref="menuRef">
    <button
      @click="open = !open"
      class="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition"
      :class="buttonClass"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
      {{ currentLabel }}
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 mt-1 w-36 origin-top-right rounded-lg border bg-white py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-700"
        :class="dropdownClass"
      >
        <button
          v-for="loc in locales"
          :key="loc.code"
          @click="selectLocale(loc.code)"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition"
          :class="[
            locale.locale === loc.code
              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
              : 'text-gray-600 hover:bg-slate-50 dark:text-neutral-300 dark:hover:bg-neutral-600',
          ]"
        >
          <span v-if="locale.locale === loc.code" class="text-indigo-500">&#10003;</span>
          <span v-else class="w-3.5"></span>
          {{ loc.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from '../i18n/index.js'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
  },
})

const { locale, setLocale, locales } = useI18n()
const open = ref(false)
const menuRef = ref(null)

const currentLabel = computed(() => {
  return locales.find(l => l.code === locale.locale)?.label || 'Language'
})

const buttonClass = computed(() => {
  if (props.variant === 'ghost') {
    return 'text-slate-400 hover:bg-white hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-300'
  }
  return 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-neutral-500 dark:hover:bg-neutral-700 dark:hover:text-neutral-300'
})

const dropdownClass = computed(() => {
  return 'border-slate-200 dark:border-neutral-600'
})

function selectLocale(code) {
  setLocale(code)
  open.value = false
}

function handleClickOutside(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>
