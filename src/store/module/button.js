const button = {
  namespaced: true,

  state: {
    gateActivated: false,
    occupationActivated: false,
    locationActivated: false,
    compassActivated: false,
    displayVirtualButton: false,
    displayRulerEvent: {
      flag: false,
      data: true
    }
  },

  mutations: {
    setDisplayVirtualButton(state, payload) {
      state.displayVirtualButton = payload
    },
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
    },
    setCompassActivated(state, payload) {
      state.compassActivated = payload
    },
    reverseCompassActivated(state, payload) {
      state.compassActivated = !state.compassActivated
    },
    setDisplayRulerEvent(state, payload) {
      state.displayRulerEvent.data = payload
      state.displayRulerEvent.flag = !state.displayRulerEvent.flag
    }
  },

  actions: {
    
  },
  
  getters: {

  }
}

export default button