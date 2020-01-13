// require("es6-promise").polyfill()
import Vue from "vue";
import Router from 'vue-router'
import './plugins/axios'
import App from "./App.vue";
import router from "./router/index";
import store from "./store/index";
import i18n from 'locales/index'
import api from 'api/index';
import toastMessage from '@/plugins/ToastMessage'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'

import mixin from '@/utils/mixin.js'
// import i18n from './i18n'

import "assets/css/datetime.scss"

const originalPush = Router.prototype.push
Router.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => err)
}

Vue.config.productionTip = false;
// Vue.use(plugin)
Vue.use(toastMessage)
Vue.prototype.$api = api;

Vue.mixin(mixin)

Vue.use(Datetime)
Vue.component('datetime', Datetime);

new Vue({
  router,
  store,
  i18n,
  render: h => h(App)
}).$mount("#app");
