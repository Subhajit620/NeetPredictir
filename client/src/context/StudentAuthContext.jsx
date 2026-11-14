import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { apiErrorMessage } from '../services/api'

const StudentAuthContext = createContext(null)

export function StudentAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profileHealth, setProfileHealth] = useState({ score: 0, isComplete: false, strengths: [], missing: [] })
  const [choiceList, setChoiceList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login') // 'login' | 'register'

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/student/profile')
      if (res.data?.success) {
        setUser(res.data.user)
        setProfileHealth(res.data.profileHealth || { score: 0, isComplete: false, strengths: [], missing: [] })
      }
    } catch (err) {
      console.warn('Failed to fetch student profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchChoiceList = useCallback(async () => {
    try {
      const res = await api.get('/student/choice-list')
      if (res.data?.success) {
        setChoiceList(res.data.choices || [])
      }
    } catch (err) {
      console.warn('Failed to fetch student choice list:', err)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
    fetchChoiceList()
  }, [fetchProfile, fetchChoiceList])

  const updateProfile = async (updates) => {
    setError('')
    try {
      const res = await api.put('/student/profile', updates)
      if (res.data?.success) {
        setUser(res.data.user)
        setProfileHealth(res.data.profileHealth)
        return { success: true, message: res.data.message }
      }
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const predictProfile = async (overrides = {}) => {
    setError('')
    try {
      const res = await api.post('/student/predict-profile', overrides)
      return res.data
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      throw new Error(msg)
    }
  }

  const addToChoiceList = async (item) => {
    setError('')
    try {
      const res = await api.post('/student/choice-list', item)
      if (res.data?.success) {
        await fetchChoiceList()
        return { success: true, message: res.data.message }
      }
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const removeFromChoiceList = async (id) => {
    setError('')
    try {
      const res = await api.delete(`/student/choice-list/${id}`)
      if (res.data?.success) {
        setChoiceList((prev) => prev.filter((c) => c._id !== id && c.collegeId?._id !== id))
        return { success: true, message: res.data.message }
      }
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const reorderChoiceList = async (orderedIds) => {
    setError('')
    try {
      const res = await api.put('/student/choice-list/reorder', { orderedIds })
      if (res.data?.success) {
        setChoiceList(res.data.choices || [])
        return { success: true }
      }
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const login = async (email, password) => {
    setError('')
    try {
      const res = await api.post('/student/login', { email, password })
      if (res.data?.success && res.data.token) {
        localStorage.setItem('neet_student_token', res.data.token)
        setUser(res.data.user)
        await fetchProfile()
        await fetchChoiceList()
        setIsAuthModalOpen(false)
        return { success: true, message: res.data.message }
      }
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const register = async (formData) => {
    setError('')
    try {
      const res = await api.post('/student/register', formData)
      if (res.data?.success && res.data.token) {
        localStorage.setItem('neet_student_token', res.data.token)
        setUser(res.data.user)
        await fetchProfile()
        await fetchChoiceList()
        setIsAuthModalOpen(false)
        return { success: true, message: res.data.message }
      }
    } catch (err) {
      const msg = apiErrorMessage(err)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const logout = () => {
    localStorage.removeItem('neet_student_token')
    fetchProfile()
    fetchChoiceList()
  }

  const isChoiceSaved = (collegeId, quota, course, returnItem = false) => {
    if (!collegeId) return returnItem ? null : false
    const targetId = String(collegeId?._id || collegeId)
    const matched = choiceList.find((c) => {
      const sameCollege = String(c.collegeId?._id || c.collegeId) === targetId
      if (!sameCollege) return false
      if (quota && c.quota && String(c.quota).toLowerCase() !== String(quota).toLowerCase()) return false
      if (course && c.course && String(c.course).toLowerCase() !== String(course).toLowerCase()) return false
      return true
    })
    return returnItem ? matched : Boolean(matched)
  }

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }

  return (
    <StudentAuthContext.Provider
      value={{
        user,
        profileHealth,
        choiceList,
        loading,
        error,
        isAuthModalOpen,
        authModalMode,
        setIsAuthModalOpen,
        openAuthModal,
        fetchProfile,
        updateProfile,
        predictProfile,
        fetchChoiceList,
        addToChoiceList,
        removeFromChoiceList,
        reorderChoiceList,
        isChoiceSaved,
        login,
        register,
        logout,
      }}
    >
      {children}
    </StudentAuthContext.Provider>
  )
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext)
  if (!context) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider')
  }
  return context
}
