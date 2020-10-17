import api from './api'

const place = {
  getPlaceInfo(params) {
    return api.get(`/place/`, params)
  },

  getOccupiedRoom(id, params) {
    return api.get(`/place/occupied/${id}`, params)
  }
}

export default place