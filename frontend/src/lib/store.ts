import { create } from 'zustand'
import { API_URL } from './api'

interface User {
  id: string
  email: string
  name: string
  dueDate?: string
  babyGender?: string
  role: 'USER' | 'ADMIN'
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadFromStorage: () => void
}

let sessionChecked = false

export const useAuthStore = create<AuthStore>((set, get) => {
  // The cached user can be stale (role changed, account deleted, token expired).
  const verifySession = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      if (get().token !== token) return
      if (res.status === 401 || res.status === 404) return get().logout()
      if (!res.ok) return
      const user = (await res.json()) as User
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch {
      // Offline or API hiccup: keep the cached session.
    }
  }

  return {
    user: null,
    token: null,
    isLoading: true,

    setAuth: (user, token) => {
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      sessionChecked = true
      set({ user, token, isLoading: false })
    },

    logout: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      set({ user: null, token: null, isLoading: false })
    },

    loadFromStorage: () => {
      if (get().user) return
      try {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')
        if (token && userStr) {
          set({ token, user: JSON.parse(userStr), isLoading: false })
          if (!sessionChecked) {
            sessionChecked = true
            verifySession(token)
          }
        } else {
          set({ isLoading: false })
        }
      } catch {
        set({ isLoading: false })
      }
    },
  }
})

/** Full page load so protected pages can't redirect to the login form mid-logout. */
export function leaveToHome() {
  window.location.assign('/')
}
