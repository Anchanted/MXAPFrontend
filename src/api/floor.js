import api from './api'

const floor = {
  getFloorInfo(params) {
    return api.get(`/floor/`, params)
  },

  getCampusInfo() {
    return api.get(`/floor/campus`)
  }
}

export default floor