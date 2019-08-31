import api from 'utils/http'

const room = {
  getRoomInfo (id) {
    return api.get(`/room/${id}`)
  },

  getOccupiedRoom (id) {
    return api.get(`/room/occupied/${id}`)
  }
}

export default room