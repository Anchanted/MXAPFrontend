const place = {
    namespaced: true,
  
    state: {
      panelMove: false,
      bodyScrollTop: 0,
      historyList: [],
      scrollToFromChild: 0,
      historyComponentHeight: 0,
      routerViewHeight: 0,
      loadMore: false
    },
  
    getters: {
  
    },
  
    mutations: {
      setPanelMove(state, payload) {
        state.panelMove = payload
      },
      setBodyScrollTop (state, payload) {
        state.bodyScrollTop = payload
      },
      setHistoryList (state, payload) {
        if (payload instanceof Array) state.historyList = payload
      },
      setScrollToFromChild (state, payload) {
        state.scrollToFromChild = payload
      },
      setHistoryComponentHeight (state, payload) {
        console.log("HistoryComponentHeight", payload)
        state.historyComponentHeight = payload
      },
      setRouterViewHeight (state, payload) {
        console.log("SearchRouterViewHeight", payload)
        state.routerViewHeight = payload
      },
      setLoadMore (state, payload) {
        state.loadMore = payload
      }
    },
  
    actions: {
      refreshHistoryList ({ commit }) {
        let historyList = JSON.parse(localStorage.getItem('historyList')) || []
        if (!(historyList instanceof Array)) historyList = []
        console.log(historyList)
        commit('setHistoryList', historyList)
      },
      saveHistoryList ({ dispatch }, item) {
        let historyList = JSON.parse(localStorage.getItem('historyList')) || []
        if (!(historyList instanceof Array)) historyList = []
        let duplicatedIndex = -1
  
        historyList.some((element, index) => {
          if (element.dataType === item.dataType) {
            if (item.dataType === 'query') {
              if (element.content === item.content) {
                duplicatedIndex = index
                return true
              }
            } else if (element.id === item.id) {
              duplicatedIndex = index
              return true
            }
          }
        })
  
        if (duplicatedIndex > -1) historyList.splice(duplicatedIndex, 1)
        historyList = [item].concat(historyList)
        if (historyList.length > 20) historyList.splice(20, historyList.length - 20)
  
        localStorage.setItem('historyList', JSON.stringify(historyList))
  
        dispatch('refreshHistoryList')
      }
    }
  }
  
  export default place
  