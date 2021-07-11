import api from './api'

const floor = {
  getFloorData(params) {
    return api.get(`/floor/`, params)
  },

  getCampusData() {
    return api.get(`/floor/campus`)
  }
}

export default floor