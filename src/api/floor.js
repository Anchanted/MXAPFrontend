import api from 'utils/http'
import { appendFile } from 'fs';

const floor = {
  getFloorInfo (buildingId, floorId) {
    if (floorId) return api.get(`/floor/${buildingId}/${floorId}`)
    else return api.get(`/floor/${buildingId}`)
  },

  getCampusInfo () {
    return api.get(`/floor/campus`)
  }
}

export default floor