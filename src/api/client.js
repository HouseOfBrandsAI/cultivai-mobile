import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cultivai_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Response envelope unwrapping.
 *
 * The grow1976 backend wraps JSON responses as:
 *   { data: <payload>, meta: <null|obj>, error: <null|obj> }
 *
 * We unwrap to the inner `data` only when the shape matches exactly (all
 * three keys present). Endpoints that return a raw body (list, scalar,
 * token response, pre-envelope legacy) are handed through untouched.
 */
function isEnvelope(body) {
  return (
    body != null &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'data' in body &&
    'meta' in body &&
    'error' in body
  )
}

api.interceptors.response.use(
  (response) => {
    const body = response.data
    return isEnvelope(body) ? body.data : body
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cultivai_token')
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
