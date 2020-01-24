import api from './api'

const building = {
  getBuildingInfo (id) {
    return api.get(`/building/${id}`)
  },

  getBuildings () {
    return api.get('/building/')
  }
}

export default building