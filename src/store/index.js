import Vue from "vue";
import Vuex from "vuex";

import place from './module/place.js'
import search from './module/search.js'
import button from './module/button.js'
import direction from './module/direction.js'

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    clientHeight: 0,
    clientWidth: 0,
    panelPosArray: [0, 0, 0],
    imageMap: new Map(),
    placeList: [],
    geolocation: {}
  },
  mutations: {
    setClientHeight (state, payload) {
      state.clientHeight = payload
    },
    setClientWidth (state, payload) {
      state.clientWidth = payload
    },
    setPanelPosArray (state, payload) {
      state.panelPosArray = payload instanceof Array ? payload : [0, 0, 0]
    },
    setImageMap(state, payload) {
      state.imageMap = payload
    },
    setPlaceList(state, payload) {
      state.placeList = payload
    },
    setGeolocation(state, payload) {
      state.geolocation = payload instanceof Object ? payload : {}
    }
  },
  actions: {
  },
  getters: {
  },
  modules: {
    place,
    search,
    button,
    direction
  }
});
