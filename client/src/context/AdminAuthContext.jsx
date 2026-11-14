import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AdminAuthContext = createContext(null)

const TOKEN_KEY = 'neet_ai_admin_token'

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(() => !!localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return

    let isMounted = true
    api
      .get('/admin/me')
      .then((res) => {
        if (isMounted) setAdmin(res.data.admin)
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/admin/login', { email, password })
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setAdmin(res.data.admin)
    return res.data.admin
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setAdmin(null)
  }, [])

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider')
  return ctx
}
