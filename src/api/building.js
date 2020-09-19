import api from './api'

const building = {
  getBuildingInfo(id) {
    return api.get(`/building/${id}`)
  }
}

export default building