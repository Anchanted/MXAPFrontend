import api from 'utils/http'

const facility = {
  getFacilityInfo (id) {
    return api.get(`/facility/${id}`)
  },
}

export default facility