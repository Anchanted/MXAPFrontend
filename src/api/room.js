import api from 'utils/http'

const room = {
  getRoomInfo (id) {
    return api.get(`/room/${id}`)
  },

  getOccupiedRoom (id, params) {
    return api.get(`/room/occupied/${id}`, params)
  }
}

export default room