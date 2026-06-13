import axios from 'axios'
import { getApiBaseUrl } from '@/config/apiBaseUrl'
import { getJwtToken } from './jwtTokenStore'

export const axiosInstance = axios.create({
  headers: {
    'Content-type': 'application/json',
  },
})

axiosInstance.interceptors.request.use(
  config => {
    config.baseURL = getApiBaseUrl()
    // Only add token on client side (not during SSR)
    if (typeof window !== 'undefined') {
      const token = getJwtToken()
      if (token) {
        if (!config.headers) {
          config.headers = {}
        }
        config.headers.Authorization = token
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  },
)
