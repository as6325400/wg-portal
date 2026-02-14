import { reactive } from 'vue'
import en from './en.js'
import zhTW from './zh-TW.js'

const messages = { en, 'zh-TW': zhTW }

const state = reactive({
  locale: localStorage.getItem('locale') || 'en',
})

function get(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

export function useI18n() {
  function t(key, params = {}) {
    let msg = get(messages[state.locale], key) || get(messages.en, key) || key
    for (const [k, v] of Object.entries(params)) {
      msg = msg.replace(`{${k}}`, v)
    }
    return msg
  }

  function setLocale(loc) {
    state.locale = loc
    localStorage.setItem('locale', loc)
  }

  return {
    t,
    locale: state,
    setLocale,
  }
}
