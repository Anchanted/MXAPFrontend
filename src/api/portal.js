import api from './api'

const portal = {
  getGateList(buildingId, floorId) {
    return api.get(`/portal/gate/${buildingId}/${floorId}`)
  },
}

export default portal