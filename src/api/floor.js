import api from './api'

const floor = {
  getFloorInfo (buildingId, floorId) {
    if (floorId) return api.get(`/floor/${buildingId}/${floorId}`)
    else return api.get(`/floor/${buildingId}`)
  },

  getCampusInfo () {
    return api.get(`/floor/campus`)
  },

  getGateList (floorId) {
    return api.get(`/floor/gate/${floorId}`)
  }
}

export default floor