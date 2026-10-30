import {
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  firebaseAuth,
  firebaseConfigured,
  firebaseSetupMessage,
  googleProvider,
} from '../utils/firebase.ts'
import type { AuthUser } from '../types/app.ts'

interface AuthContextValue {
  authSetupMessage: string | null
  demoMode: boolean
  getToken: () => Promise<string | null>
  googleAuthAvailable: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
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

function getAuthErrorCode(error: unknown) {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof (error as { code: unknown }).code === 'string'
  ) {
    return (error as { code: string }).code
  }

  return null
}

function formatAuthError(error: unknown, action: 'login' | 'signup' | 'google') {
  const code = getAuthErrorCode(error)

  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return new Error('This email already uses a different sign-in method. Try the original provider first.')
    case 'auth/cancelled-popup-request':
      return new Error('Google sign-in is already opening in another window. Please finish that flow first.')
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return new Error('Enable Google sign-in in Firebase Authentication before using this button.')
    case 'auth/email-already-in-use':
      return new Error('This email is already in use. Try logging in instead.')
    case 'auth/invalid-credential':
      return new Error(action === 'google'
        ? 'Google sign-in did not return a valid credential. Check your Firebase app settings and try again.'
        : 'The email or password is incorrect.')
    case 'auth/invalid-email':
      return new Error('Enter a valid email address.')
    case 'auth/operation-not-supported-in-this-environment':
      return new Error('Google sign-in is not supported in this browser environment. Try a normal browser tab.')
    case 'auth/popup-blocked':
      return new Error('The browser blocked the Google popup. Allow popups for this site and try again.')
    case 'auth/popup-closed-by-user':
      return new Error('The Google sign-in window was closed before completion.')
    case 'auth/too-many-requests':
      return new Error('Too many sign-in attempts were made. Please wait a moment and try again.')
    case 'auth/unauthorized-domain':
      return new Error('This domain is not allowed in Firebase Authentication. Add it to your Firebase authorized domains.')
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return new Error('The email or password is incorrect.')
    case 'auth/weak-password':
      return new Error('Choose a stronger password with at least 6 characters.')
    default:
      if (error instanceof Error && error.message) {
        return new Error(error.message)
      }

      return new Error(
        action === 'signup'
          ? 'Could not create your account right now.'
          : action === 'google'
            ? 'Google sign-in is unavailable at the moment.'
            : 'Invalid credentials. Please try again.',
      )
  }
}

function shouldUseRedirectForGoogle(error: unknown) {
  const code = getAuthErrorCode(error)
  return code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment'
}

export function AuthProvider({ children }: PropsWithChildren) {
  const isDemoMode = !firebaseConfigured || !firebaseAuth
  const googleAuthAvailable = Boolean(firebaseConfigured && firebaseAuth && googleProvider)
  const [user, setUser] = useState<AuthUser | null>(() =>
    isDemoMode ? readStoredDemoUser() : null,
  )
  const [loading, setLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (isDemoMode || !firebaseAuth) {
      setLoading(false)
      return
    }

    let active = true
    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      if (!active) {
        return
      }

      setUser(nextUser ? mapFirebaseUser(nextUser) : null)
      setLoading(false)
    })

    void getRedirectResult(firebaseAuth).catch((error) => {
      if (!active) {
        return
      }

      console.error('Failed to finish the Google redirect flow.', error)
      setLoading(false)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [isDemoMode])

  const login = async (email: string, password: string) => {
    if (!firebaseConfigured || !firebaseAuth) {
      const demoUser = buildDemoUser(email)
      persistDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password)
    } catch (error) {
      throw formatAuthError(error, 'login')
    }
  }

  const signup = async (email: string, password: string, requestedName: string) => {
    const displayName = requestedName.trim() || displayNameFromEmail(email)
    if (!firebaseConfigured || !firebaseAuth) {
      const demoUser = { ...buildDemoUser(email), displayName }
      persistDemoUser(demoUser)
      setUser(demoUser)
      return
    }

    try {
      const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password)
      await updateProfile(credentials.user, { displayName })
      setUser(mapFirebaseUser({ ...credentials.user, displayName }))
    } catch (error) {
      throw formatAuthError(error, 'signup')
    }
  }

  const updateDisplayName = async (requestedName: string) => {
    const displayName = requestedName.trim()
    if (!displayName) {
      throw new Error('Enter your name before saving.')
    }

    if (isDemoMode || !firebaseAuth) {
      if (!user) return
      const updatedUser = { ...user, displayName }
      persistDemoUser(updatedUser)
      setUser(updatedUser)
      return
    }

    const currentUser = firebaseAuth.currentUser
    if (!currentUser) {
      throw new Error('Your sign-in session expired. Please sign in again.')
    }

    try {
      await updateProfile(currentUser, { displayName })
      await currentUser.getIdToken(true)
      setUser(mapFirebaseUser(currentUser))
    } catch (error) {
      throw error instanceof Error ? error : new Error('Could not update your profile name.')
    }
  }

  const loginWithGoogle = async () => {
    if (!firebaseConfigured || !firebaseAuth || !googleProvider) {
      throw new Error(firebaseSetupMessage ?? 'Google sign-in requires Firebase configuration.')
    }

    try {
      const credentials = await signInWithPopup(firebaseAuth, googleProvider)
      setUser(mapFirebaseUser(credentials.user))
    } catch (error) {
      if (shouldUseRedirectForGoogle(error)) {
        await signInWithRedirect(firebaseAuth, googleProvider)
        return
      }

      throw formatAuthError(error, 'google')
    }
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
        authSetupMessage: firebaseSetupMessage,
        demoMode: isDemoMode,
        getToken,
        googleAuthAvailable,
        loading,
        login,
        loginWithGoogle,
        logout,
        signup,
        updateDisplayName,
        user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
