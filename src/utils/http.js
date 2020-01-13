import axios from 'axios'
import store from '../store';
import toastMessage from '@/plugins/ToastMessage'
// const qs = require('qs')

const instance = axios.create()

instance.defaults.baseURL = process.env.VUE_APP_BASE_API
instance.defaults.headers['Content-type'] = 'application/x-www-form-urlencoded'
instance.defaults.withCredentials = true
instance.defaults.timeout = 10000

// 响应拦截器
instance.interceptors.response.use(    
  // 请求成功
  res => res.status === 200 ? Promise.resolve(res) : Promise.reject(res),    
  // 请求失败
  error => {
    console.log(error)
    const { response } = error;
    if (response) {
      // 请求已发出，但是不在2xx的范围 
      errorHandle(response.status, response.data.msg);
      return Promise.reject(response);
    } else {
      // 处理断网的情况
      // eg:请求超时或断网时，更新state的network状态
      // network状态在app.vue中控制着一个全局的断网提示组件的显示隐藏
      // 关于断网组件中的刷新重新获取数据，会在断网组件中说明
      if (!window.navigator.onLine) {
        store.commit('changeNetwork', false);
      } else {
        return Promise.reject(error);
      }
    }
  })

const errorHandle = (status, other) => {
  // 状态码判断
  switch (status) {
    // // 401: 未登录状态，跳转登录页
    // case 401:
    //   toLogin();
    //   break;
    // // 403 token过期
    // // 清除token并跳转登录页
    // case 403:
    //   tip('登录过期，请重新登录');
    //   localStorage.removeItem('token');
    //   store.commit('loginSuccess', null);
    //   setTimeout(() => {
    //     toLogin();
    //   }, 1000);
    //   break;
    // 404请求不存在
    case 404:
      toastMessage({
        message: '请求的资源不存在',
        time: 3000
      }); 
      break;
    default:
      console.log(other);   
    }}

const api = {
  get: (url, params) => {
    return new Promise((resolve, reject) =>{        
      instance.get(url, {            
        params: params        
      }).then(res => {
        if (res.status === 200 && res.data.code === 1) resolve(res.data.data)
        else reject(res)
      }).catch(err => reject(err))    
    })   
  }
}

export default api 

// export default instance