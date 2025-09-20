import axios from 'axios'
import { ElMessage } from 'element-plus'
// 基地址
const baseURL = '/xxx'

// 创建axios实例
const instance = axios.create({
  baseURL, //基地址
  timeout: 5000 //超时时间
})

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 请求发送前做的事情：例如统一携带token
    // const token = getToken()
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    // 处理业务数据
    const res = response.data
    if (res.code === 200) {
      return res.data
    }

    ElMessage.error(res.message || 'Error')
    return Promise.reject(new Error(res.message || 'Error'))
  },
  (error) => {
    // 处理请求错误
    let message = ''
    const status = error.response?.status
    switch (status) {
      case 401:
        message = 'token失效，请重新登录'
        // 这里可以触发退出的逻辑
        break
      case 403:
        message = '权限不足'
        break
      case 404:
        message = '请求地址错误'
        break
      case 500:
        message = '服务器出现问题'
        break
      default:
        message = '网络出现问题'
        break
    }

    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default instance
