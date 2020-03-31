const button = {
  namespaced: true,

  state: {
    gateActivated: false,
    occupationActivated: false,
    locationActivated: false
  },

  mutations: {
    setGateActivated(state, payload) {
      state.gateActivated = payload
    },
    reverseGateActivated(state, payload) {
      state.gateActivated = !state.gateActivated
    },
    setOccupationActivated(state, payload) {
      state.occupationActivated = payload
    },
    reverseOccupationActivated(state, payload) {
      state.occupationActivated = !state.occupationActivated
    },
    setLocationActivated(state, payload) {
      state.locationActivated = payload
    },
    reverseLocationActivated(state, payload) {
      state.locationActivated = !state.locationActivated
    }
  },

  actions: {
    
  },
  
  getters: {

  }
}

export default button