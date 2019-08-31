import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    loading: false,
  },
  mutations: {
    setLoading (state, payload) {
      state.loading = payload
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
  }
});
