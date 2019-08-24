// require("es6-promise").polyfill()
import Vue from "vue";
import './plugins/axios'
import App from "./App.vue";
import router from "./router/index";
import store from "./store";
import api from 'api/api';

import "assets/css/iconfont/iconfont.css";

Vue.config.productionTip = false;
// Vue.use(plugin)
Vue.prototype.$api = api;

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
