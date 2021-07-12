const place = {
  namespaced: true,

  state: {
    posY: 0,
    collapse: true,
    displayHeader: false,
    headerName: "",
    bodyHeight: 0,
    routerLeave: false
  },

  getters: {

  },

  mutations: {
    setPosY(state, payload) {
      state.posY = payload
    },
    setCollapse(state, payload) {
      state.collapse = payload
    },
    setDisplayHeader(state, payload) {
      state.displayHeader = payload
    },
    setHeaderName(state, payload) {
      state.headerName = payload
    },
    setBodyHeight(state, payload) {
      console.log("Place", payload)
      state.bodyHeight = payload
    },
    setRouterLeave(state, payload) {
      state.routerLeave = payload
    }
  },

  actions: {
    
  }
}

export default place
