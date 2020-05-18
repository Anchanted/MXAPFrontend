const direction = {
  namespaced: true,

  state: {
    displayDirection: false,
    globalFromText: "",
    globalToText: "",
    globalFromId: "",
    globalToId: "",
    globalPathList: []
  },

  getters: {

  },

  mutations: {
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
    }
  },

  actions: {
    
  }
}

export default direction
