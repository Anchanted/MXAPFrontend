const direction = {
  namespaced: true,

  state: {
    collapse: true,
    bodyHeight: 0,
    routerLeave: false,
    displayDirection: false,
    globalFromText: "",
    globalToText: "",
    globalFromId: "",
    globalToId: "",
    globalPathList: [],
    selectorRouter: [],
    selectorIsTo: false,
    cachedPlaceParams: null
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
    setGlobalFromId(state, payload) {
      state.globalFromId = payload && /^[0-9]+|[a-z]+$/.test(payload) ? payload : ""
    },
    setGlobalToId(state, payload) {
      state.globalToId = payload && /^[0-9]+|[a-z]+$/.test(payload) ? payload : ""
    },
    setGlobalPathList(state, payload) {
      state.globalPathList = payload instanceof Array ? payload : []
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
    setSelectorIsTo(state, payload) {
      state.selectorIsTo = payload
    },
    setCachedPlaceParams(state, payload) {
      state.cachedPlaceParams = payload
    }
  },

  actions: {
    
  }
}

export default direction
