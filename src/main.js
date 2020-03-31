// require("es6-promise").polyfill()
import Vue from "vue";
import Router from 'vue-router'
import App from "./App.vue";
import router from "router";
import store from "store";
import i18n from 'locales'
import api from 'api';
import toastMessage from 'plugins/ToastMessage'
import { Datetime } from 'vue-datetime'
import 'vue-datetime/dist/vue-datetime.css'

import mixin from 'assets/js/mixin.js'

import "assets/css/datetime.scss"

String.prototype.capitalize = function() {
  return this.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); });
};

// const originalPush = Router.prototype.push
// Router.prototype.push = function push(location) {
//   return originalPush.call(this, location).catch(err => err)
// }

Vue.config.productionTip = false;

Vue.prototype.$api = api;

Vue.use(toastMessage)

Vue.mixin(mixin)

Vue.use(Datetime)
Vue.component('datetime', Datetime);

new Vue({
  router,
  store,
  i18n,
  render: h => h(App)
}).$mount("#app");
