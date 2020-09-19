import api from './api'

const facility = {
  getFacilityInfo(id) {
    return api.get(`/facility/${id}`)
  },
}

export default facility