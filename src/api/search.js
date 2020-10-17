import api from './api'

const search = {
  searchTop(params) {
    return api.get(`/search/`, params)
  },

  searchPage(params) {
    return api.get(`/search/page`, params)
  },

  searchKeyword(params, options) {
    return api.get(`/search/keyword`, params, options)
  },

  searchGeo(params, options) {
    return api.get(`/search/geo`, params, options)
  }
}

export default search