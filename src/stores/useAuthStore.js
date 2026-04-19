import { create } from 'zustand'
import api from '../api/client'

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('cultivai_token'),
  isAuthenticated: !!localStorage.getItem('cultivai_token'),

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const token = res?.access_token || res?.token
    if (!token) throw new Error('No token in response')
    localStorage.setItem('cultivai_token', token)
    set({ token, isAuthenticated: true })
    const me = await api.get('/auth/me')
    set({ user: me })
    return me
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me')
      set({ user: res, isAuthenticated: true })
    } catch {
      localStorage.removeItem('cultivai_token')
      set({ user: null, isAuthenticated: false, token: null })
    }
  },

  logout: () => {
    localStorage.removeItem('cultivai_token')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))

export default useAuthStore
