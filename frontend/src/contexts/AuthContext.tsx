import {
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { firebaseAuth, firebaseConfigured, googleProvider } from '../utils/firebase.ts'
import type { AuthUser } from '../types/app.ts'

interface AuthContextValue {
  demoMode: boolean
  getToken: () => Promise<string | null>
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  user: AuthUser | null
}

const AuthContext = createContext<AuthContextValue | null>(null)

const DEMO_STORAGE_KEY = 'ai-study-assistant-demo-user'

function displayNameFromEmail(email: string) {
  const prefix = email.split('@')[0] ?? 'study'
  return prefix
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildDemoUser(email: string): AuthUser {
  return {
    uid: `demo-${email.replace(/[^a-z0-9]/gi, '').toLowerCase()}`,
    email,
    displayName: displayNameFromEmail(email),
  }
}

function readStoredDemoUser() {
  const stored = window.localStorage.getItem(DEMO_STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

function persistDemoUser(user: AuthUser | null) {
  if (!user) {
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user))
}

function mapFirebaseUser(user: {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
}) {
  return {
    uid: user.uid,
    email: user.email ?? 'unknown@example.com',
    displayName: user.displayName ?? displayNameFromEmail(user.email ?? 'student@example.com'),
    photoURL: user.photoURL,
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const isDemoMode = !firebaseConfigured || !firebaseAuth
  const [user, setUser] = useState<AuthUser | null>(() =>
    isDemoMode ? readStoredDemoUser() : null,
  )
  const [loading, setLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (isDemoMode || !firebaseAuth) {
      return
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser ? mapFirebaseUser(nextUser) : null)
      setLoading(false)
    })

    return unsubscribe
  }, [isDemoMode])

  const login = async (email: string, password: string) => {
    if (!firebaseConfigured || !firebaseAuth) {
      const demoUser = buildDemoUser(email)
      persistDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    await signInWithEmailAndPassword(firebaseAuth, email, password)
  }

  const signup = async (email: string, password: string) => {
    if (!firebaseConfigured || !firebaseAuth) {
      const demoUser = buildDemoUser(email)
      persistDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password)
    const displayName = displayNameFromEmail(email)
    await updateProfile(credentials.user, { displayName })
    setUser(mapFirebaseUser({ ...credentials.user, displayName }))
  }

  const loginWithGoogle = async () => {
    if (!firebaseConfigured || !firebaseAuth || !googleProvider) {
      const demoUser = buildDemoUser('student@demo.ai')
      persistDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    const credentials = await signInWithPopup(firebaseAuth, googleProvider)
    setUser(mapFirebaseUser(credentials.user))
  }

  const logout = async () => {
    if (!firebaseConfigured || !firebaseAuth) {
      persistDemoUser(null)
      setUser(null)
      return
    }

    await signOut(firebaseAuth)
  }

  const getToken = async () => {
    if (!firebaseConfigured || !firebaseAuth) {
      return user ? `demo-${user.uid}` : null
    }

    return firebaseAuth.currentUser?.getIdToken() ?? null
  }

  return (
    <AuthContext.Provider
      value={{
        demoMode: isDemoMode,
        getToken,
        loading,
        login,
        loginWithGoogle,
        logout,
        signup,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
