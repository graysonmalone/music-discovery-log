import { createContext, useContext, useState } from 'react'
import { login as apiLogin, register as apiRegister } from '@/api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  async function login(email, password) {
    const data = await apiLogin(email, password)
    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  async function register(name, email, password) {
    const data = await apiRegister(name, email, password)
    sessionStorage.setItem('token', data.token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  function logout() {
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
