import axios from 'axios'
import { getClientId } from './clientId'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

api.interceptors.request.use((config) => {
  config.headers['x-client-id'] = getClientId()

  const adminToken = localStorage.getItem('neet_ai_admin_token')
  const studentToken = localStorage.getItem('neet_student_token')

  if (adminToken && config.url?.startsWith('/admin')) {
    config.headers.Authorization = `Bearer ${adminToken}`
  } else if (studentToken) {
    config.headers.Authorization = `Bearer ${studentToken}`
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      localStorage.removeItem('neet_ai_admin_token')
    } else if (err.response?.status === 401 && err.config?.url?.startsWith('/student/')) {
      // If student token expired, clear it
      localStorage.removeItem('neet_student_token')
    }
    return Promise.reject(err)
  }
)

export function apiErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.'
}

export default api
