import axios from 'axios'
import { apiBaseUrl } from '@/config/apiBaseUrl'
import { getJwtToken } from './jwtTokenStore'

export const axiosInstance = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-type': 'application/json',
  },
})

// Request interceptor to add JWT token to API requests only
axiosInstance.interceptors.request.use(
  config => {
    // Only add token on client side (not during SSR)
    if (typeof window !== 'undefined') {
      const requestUrl = config.baseURL || config.url || ''
      // Only add token if the request is going to our API
      if (
        requestUrl.includes(apiBaseUrl) ||
        config.baseURL === apiBaseUrl
      ) {
        const token = getJwtToken()
        if (token) {
          if (!config.headers) {
            config.headers = {}
          }
          config.headers.Authorization = token
        }
      }
    }
    return config
  },
  error => {
    return Promise.reject(error)
  },
)
