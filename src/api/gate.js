import api from './api'

const gate = {
  getGateList (floorId) {
    return api.get(`/gate/floor/${floorId}`)
  },
}

export default gate