import api from './api'

const search = {
  searchTop (params) {
    return api.get(`/search/`, params)
  },

  searchMore (dataType, params) {
    return api.get(`/search/${dataType}`, params)
  }
}

export default search