import axios from 'axios'
// const qs = require('qs')
axios.defaults.baseURL = process.env.VUE_APP_BASE_API
axios.defaults.headers['Content-type'] = 'application/x-www-form-urlencoded'
axios.defaults.withCredentials = true
axios.defaults.timeout = 10000

const api = {
  get: function(url,params){
    return new Promise((resolve,reject) => {
      axios.get(url,{
        params:params,
        // headers: {
        //   "X-Requested-With": "XMLHttpRequest",
        //   "Accept": "application/json",
        //   "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        // }
      })
      .then((response) => {
        resolve( response.data );
      })
      .catch((error) => {
        reject( error.response );
      });
    })
  },
  post: function(url,params){
    return new Promise((resolve,reject) => {
      axios.post(baseUrl+url,params)
      .then((response) => {
        resolve( response.data );
      })
      .catch((err) => {
        reject( err );
      });
    })
  }
}

// export default function plugin (Vue) {
//   if (plugin.installed) {
//     return
//   }
//   plugin.installed = true
//   Object.defineProperties(Vue.prototype, {
//     $api: api
//   })
// }
export default api