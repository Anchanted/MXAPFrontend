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
    imageWidth: 0,
    imageHeight: 0,
    panelPosArray: [0, 0, 0],
    scale: 1,
    zoom: 1,
    imageMap: new Map(),
    imageRotation: false,
    imageMarginColor: "#ffffff",
    pixelPerMeter: 1.516854, // 890 1350
    rulerUnitArray: [1, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 500000, 1000000, 2000000, 5000000],
    currentBuildingId: null,
    cachedBuildingList: [],
    cachedFloorList: [],
    requestingFloorSet: new Set(),
    centerLocation: {},
    geolocation: {},
    userDirection: null,
    maxScale: 6,
    minScale: 1,
    indoorScale: 3,
    imageUrlListEvent: {
      flag: false,
      data: []
    },
    floorDataEvent: {
      flag: false,
      buildingId: null,
      floorId: null
    },
    firstRouteName: null,
    firstRouteValue: null
  },
  mutations: {
    setClientHeight (state, payload) {
      state.clientHeight = payload
    },
    setClientWidth (state, payload) {
      state.clientWidth = payload
    },
    setImageWidth (state, payload) {
      state.imageWidth = payload
    },
    setImageHeight (state, payload) {
      state.imageHeight = payload
    },
    setPanelPosArray (state, payload) {
      state.panelPosArray = payload instanceof Array ? payload : [0, 0, 0]
    },
    setScale(state, payload) {
      state.scale = payload
    },
    setZoom(state, payload) {
      state.zoom = payload
    },
    setImageMap(state, payload) {
      state.imageMap = payload
    },
    setImageRotation(state, payload) {
      state.imageRotation = payload
    },
    setImageMarginColor(state, payload) {
      state.imageMarginColor = payload
    },
    setCurrentBuildingId(state, payload) {
      if (payload !== state.currentBuildingId) {
        state.currentBuildingId = payload
      }
    },
    setCachedBuildingList(state, payload) {
      state.cachedBuildingList = payload
    },
    setCachedFloorList(state, payload) {
      state.cachedFloorList = payload
    },
    setRequestingFloorSet(state, payload) {
      state.requestingFloorSet = payload
    },
    setCenterLocation(state, payload) {
      state.centerLocation = payload instanceof Object ? payload : {}
    },
    setGeolocation(state, payload) {
      state.geolocation = payload instanceof Object ? payload : {}
    },
    setUserDirection(state, payload) {
      state.userDirection = payload
    },
    setImageUrlListEvent(state, payload) {
      state.imageUrlListEvent.data = payload
      state.imageUrlListEvent.flag = !state.imageUrlListEvent.flag
    },
    setFloorDataEvent(state, [buildingId = null, floorId = null] = []) {
      state.floorDataEvent.buildingId = buildingId
      state.floorDataEvent.floorId = floorId
      state.floorDataEvent.flag = !state.floorDataEvent.flag
    },
    setFirstRouteName(state, payload) {
      state.firstRouteName = payload
    },
    setFirstRouteValue(state, payload) {
      state.firstRouteValue = payload
    },
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
