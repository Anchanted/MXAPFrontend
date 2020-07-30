const place = {
  namespaced: true,

  state: {
    displayHeader: false,
    headerName: "",
    collapse: true,
    bodyHeight: 0,
    routerLeave: false
  },

  getters: {

  },

  mutations: {
    setDisplayHeader(state, payload) {
      state.displayHeader = payload
    },
    setHeaderName(state, payload) {
      state.headerName = payload
    },
    setCollapse(state, payload) {
      state.collapse = payload
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
