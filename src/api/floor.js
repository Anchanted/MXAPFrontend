import api from './api'

const floor = {
  getFloorInfo(floorId, buildingId) {
    if (floorId) return api.get(`/floor/${floorId}/${buildingId}`)
    else return api.get(`/floor/${buildingId}`)
  },

  getCampusInfo() {
    return api.get(`/floor/campus`)
  }
}

export default floor