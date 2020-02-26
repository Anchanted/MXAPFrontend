import Vue from "vue";
import Vuex from "vuex";

import place from './module/place.js'
import search from './module/search.js'
import button from './module/button.js'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    clientHeight: 0,
    clientWidth: 0,
  },
  mutations: {
    setClientHeight (state, payload) {
      state.clientHeight = payload
    },
    setClientWidth (state, payload) {
      state.clientWidth = payload
    },
  },
  actions: {
  },
  getters: {
  },
  modules: {
    place,
    search,
    button
  }
});
