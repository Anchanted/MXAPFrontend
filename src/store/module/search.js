const search = {
    namespaced: true,
  
    state: {
      bodyScrollTop: 0,
      historyList: [],
      scrollToFromChild: 0,
      historyComponentHeight: 0,
      keywordComponentHeight: 0,
      routerViewHeight: 0,
      loadMore: false
    },
  
    getters: {
  
    },
  
    mutations: {
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
      setKeywordComponentHeight (state, payload) {
        console.log("KeywordComponentHeight", payload)
        state.keywordComponentHeight = payload
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
      refreshHistoryList ({ commit }, unifySearchItem) {
        let historyList = JSON.parse(localStorage.getItem('historyList')) || []
        if (!(historyList instanceof Array)) historyList = []
        console.log(unifySearchItem(historyList))
        commit('setHistoryList', unifySearchItem(historyList))
      },
      saveHistoryList ({ dispatch }, { item, unifySearchItem }) {
        let historyList = JSON.parse(localStorage.getItem('historyList')) || []
        if (!(historyList instanceof Array)) historyList = []
        let duplicatedIndex = -1

        if (item instanceof Object) {
          historyList.some((element, index) => {
            if (element.dataType === item.dataType) {
              if (item.dataType === 'query') {
                if (element.name === item.name) {
                  duplicatedIndex = index
                  return true
                }
              } else if (element.id === item.id) {
                duplicatedIndex = index
                return true
              }
            }
          })
        } else if (typeof item === "number") {
          duplicatedIndex = item
        }
  
        if (duplicatedIndex > -1) historyList.splice(duplicatedIndex, 1)
        if (item instanceof Object) historyList.unshift(item)
        if (historyList.length > 20) historyList.splice(20)
  
        localStorage.setItem('historyList', JSON.stringify(historyList))
  
        dispatch('refreshHistoryList', unifySearchItem)
      }
    }
  }
  
  export default search
  