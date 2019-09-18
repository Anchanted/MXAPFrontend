import Vue from 'vue'
import VueI18n from 'vue-i18n'
import en from './en'
import es from './es'
import ja from './ja'
import zh from './zh'
Vue.use(VueI18n)

const messages = {
  zh,
  en,
  es,
  // ja
}

export default new VueI18n({
  locale : 'en', 
  fallbackLocale: 'en',
  messages,
  silentTranslationWarn: true
})