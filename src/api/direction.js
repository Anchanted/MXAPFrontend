import api from './api'

const direction = {
  getPath (start, end) {
    return api.get(`/direction/`, {
      from: start,
      to: end
    })
  }
}

export default direction