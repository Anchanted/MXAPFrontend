import api from './api'

const place = {
  getPlaceInfo (id, placeType) {
    return api.get(`/place/${placeType}/${id}`)
  }
}

export default place