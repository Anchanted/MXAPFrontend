import api from './api'

const place = {
  getPlaceInfo(params) {
    return api.get(`/place/`, params)
  }
}

export default place