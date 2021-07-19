import api from './api'

const place = {
  getPlaceInfo(params) {
    return api.get(`/place/`, params)
  },

  getOccupiedRoom(id, params) {
    return api.get(`/place/occupied/${id}`, params)
  },

  getPortalList(floorId) {
    return api.get(`/place/portal/${floorId}`)
  }
}

export default place