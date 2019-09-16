const place = {
    namespaced: true,
  
    state: {
      displayHeader: false,
      collapse: true,
      panelMove: false,
      bodyHeight: 0,
      deltaY: 0,
      maxHeight: 0,
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
      },
      setDeltaY (state, payload) {
        state.deltaY = payload
      },
      setMaxHeight (state, payload) {
        state.maxHeight = payload
      }
    },
  
    actions: {
      
    }
  }
  
  export default place
  