import api from './api'

const direction = {
  getPath(params) {
    return api.get(`/direction/`, params)
  }
}

export default direction