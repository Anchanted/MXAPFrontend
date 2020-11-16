const direction = {
  namespaced: true,

  state: {
    collapse: true,
    bodyHeight: 0,
    routerLeave: false,
    displayDirection: false,
    globalFromText: "",
    globalToText: "",
    globalFromObj: {},
    globalToObj: {},
    globalPathList: [],
    globalPathListIndex: -1,
    selectorRouter: [],
    isSelectorTo: false,
    cachedPlaceInfo: {},
    transportIndex: 0
  },

  getters: {

  },

  mutations: {
    setCollapse(state, payload) {
      state.collapse = payload
    },
    setBodyHeight(state, payload) {
      console.log("Direction", payload)
      state.bodyHeight = payload
    },
    setRouterLeave(state, payload) {
      state.routerLeave = payload
    },
    setDisplayDirection(state, payload) {
      state.displayDirection = payload
    },
    setGlobalFromText(state, payload) {
      state.globalFromText = payload
    },
    setGlobalToText(state, payload) {
      state.globalToText = payload
    },
    setGlobalFromObj(state, payload) {
      state.globalFromObj = payload instanceof Object ? payload : {}
    },
    setGlobalToObj(state, payload) {
      state.globalToObj = payload instanceof Object ? payload : {}
    },
    setGlobalPathList(state, payload) {
      state.globalPathList = payload instanceof Array ? payload : []
    },
    setGlobalPathListIndex(state, payload) {
      state.globalPathListIndex = payload
    },
    toSelector(state, isForward = false) {
      if (isForward) {
        if (state.selectorRouter.length === 0) state.selectorRouter.push("selector")
      } else {
        if (state.selectorRouter.length === 2 && state.selectorRouter.indexOf("selector") === 0 && state.selectorRouter.indexOf("map") === 1)
          state.selectorRouter.pop()
      }
    },
    toSelectorMap(state, payload) {
      if (state.selectorRouter.length === 1 && state.selectorRouter.indexOf("selector") === 0) state.selectorRouter.push("map")
    },
    clearSelectorRouter(state, payload) {
      state.selectorRouter = []
    },
    setIsSelectorTo(state, payload) {
      state.isSelectorTo = payload
    },
    setCachedPlaceInfo(state, payload) {
      state.cachedPlaceInfo = payload
    },
    setTransportIndex(state, payload) {
      state.transportIndex = payload
    }
  },

  actions: {
    
  }
}

export default direction
