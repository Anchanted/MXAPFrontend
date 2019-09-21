import Vue from "vue";
import Vuex from "vuex";

import place from './module/place.js'
import search from './module/search.js'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    clientHeight: 0,
    clientWidth: 0,
    loading: false,
    errorRefresh: false,
  },
  mutations: {
    setClientHeight (state, payload) {
      state.clientHeight = payload
    },
    setClientWidth (state, payload) {
      state.clientWidth = payload
    },
    setLoading (state, payload) {
      state.loading = payload
    },
    setErrorRefresh (state, payload) {
      state.errorRefresh = payload
    }
  },
  actions: {
    displayLoading ({ commit }) {
      commit('setLoading', true)
    },
    hideLoading ({ commit }) {
      commit('setLoading', false)
    }
  },
  getters: {
    getLoading (state) {
      return state.loading
    }
  },
  modules: {
    place,
    search
  }
});
