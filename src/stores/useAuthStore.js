import { create } from 'zustand'
import api from '../api/client'

/**
 * Prefer /users/me (bonus endpoint from the ops-sync stubs) because it
 * returns the full mobile user shape: allow_live_preview, push_token,
 * push_platform, notify_prefs, plus the core auth fields. Falls back to
 * /auth/me if the new endpoint isn't present (keeps the scaffold usable
 * against legacy environments).
 */
async function loadMe() {
  try {
    return await api.get('/users/me')
  } catch (err) {
    if (err?.response?.status === 404) {
      return await api.get('/auth/me')
    }
    throw err
  }
}

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
    const me = await loadMe()
    set({ user: me })
    return me
  },

  fetchMe: async () => {
    try {
      const me = await loadMe()
      set({ user: me, isAuthenticated: true })
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
