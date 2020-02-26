const place = {
  namespaced: true,

  state: {
    displayHeader: false,
    collapse: true,
    panelMove: false,
    bodyHeight: 0
  },

  getters: {

  },

  mutations: {
    setDisplayHeader(state, payload) {
      state.displayHeader = payload
    },
    setCollapse(state, payload) {
      state.collapse = payload
    },
    setPanelMove(state, payload) {
      state.panelMove = payload
    },
    setBodyHeight(state, payload) {
      console.log(payload)
      state.bodyHeight = payload
    }
  },

  actions: {
    
  }
}

export default place
