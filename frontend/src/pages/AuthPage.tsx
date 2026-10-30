import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  LoaderCircle,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/client.ts'
import { useAuth } from '../contexts/useAuth.ts'
import type { BackendHealth } from '../types/app.ts'

type AuthMode = 'login' | 'signup'

interface BackendConnectionState {
  detail: string
  health: BackendHealth | null
  status: 'checking' | 'offline' | 'online'
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function buildBackendDetail(health: BackendHealth) {
  return `Connected to the backend with ${health.storage} storage and ${health.ai} AI mode.`
}

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    authSetupMessage,
    demoMode,
    googleAuthAvailable,
    loading,
    login,
    loginWithGoogle,
    signup,
    user,
  } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [backendState, setBackendState] = useState<BackendConnectionState>({
    detail: 'Checking backend connection...',
    health: null,
    status: 'checking',
  })

  const nextPath = (location.state as { from?: string } | null)?.from ?? '/chats'

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true })
    }
  }, [nextPath, navigate, user])

  const checkBackendStatus = useCallback(async () => {
    setBackendState({
      detail: 'Checking backend connection...',
      health: null,
      status: 'checking',
    })

    try {
      const health = await api.getHealth()
      setBackendState({
        detail: buildBackendDetail(health),
        health,
        status: 'online',
      })
    } catch (healthError) {
      setBackendState({
        detail: healthError instanceof Error
          ? healthError.message
          : 'Could not reach the backend right now.',
        health: null,
        status: 'offline',
      })
    }
  }, [])

  useEffect(() => {
    void checkBackendStatus()
  }, [checkBackendStatus])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="panel-strong flex items-center gap-3 rounded-full px-5 py-3 text-sm text-[color:var(--muted)]">
          <LoaderCircle className="size-4 animate-spin text-[color:var(--accent)]" />
          Checking your sign-in session...
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to={nextPath} replace />
  }

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const normalizedEmail = email.trim()
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    if (password.trim().length < 6) {
      setError('Use a password with at least 6 characters.')
      return
    }

    setSubmitting(true)

    try {
      if (mode === 'login') {
        await login(normalizedEmail, password)
      } else {
        if (!displayName.trim()) {
          setError('Enter your name to create your account.')
          return
        }
        await signup(normalizedEmail, password, displayName)
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : mode === 'login'
            ? 'Invalid credentials. Please try again.'
            : 'Could not create your account right now.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setSubmitting(true)
    setError(null)

    try {
      await loginWithGoogle()
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Google sign-in is unavailable at the moment.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const backendStatusTone = backendState.status === 'online'
    ? 'border-[rgba(99,230,190,0.24)] bg-[rgba(99,230,190,0.08)] text-[color:var(--text)]'
    : backendState.status === 'offline'
      ? 'border-[rgba(255,181,155,0.24)] bg-[rgba(255,181,155,0.08)] text-[color:var(--text)]'
      : 'border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] text-[color:var(--text)]'

  const submitLabel = mode === 'login'
    ? demoMode
      ? 'Enter Demo Workspace'
      : 'Login'
    : demoMode
      ? 'Create Demo Workspace'
      : 'Create Account'

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mesh-orb left-[-4rem] top-[-3rem] size-56 bg-[rgba(82,246,213,0.16)]" />
      <div className="mesh-orb bottom-[-6rem] right-[-3rem] size-72 bg-[rgba(248,195,108,0.14)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-4 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch lg:gap-6">
        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="panel-strong order-1 flex flex-col justify-center rounded-[32px] p-5 sm:p-7 lg:order-2 lg:rounded-[36px] lg:p-10"
          initial={{ opacity: 0, x: 18 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[color:var(--muted)]">
              {demoMode ? 'Demo auth mode' : 'Firebase auth ready'}
            </span>
            <span className="rounded-full border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[color:var(--muted)]">
              {backendState.status === 'online'
                ? 'Backend online'
                : backendState.status === 'offline'
                  ? 'Backend needs attention'
                  : 'Checking backend'}
            </span>
          </div>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted)]">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text)] sm:text-4xl">
              {mode === 'login' ? 'Continue your study flow' : 'Start your AI workspace'}
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)] sm:text-base">
              {demoMode
                ? 'Email sign-in is running in local demo mode right now. Google sign-in will activate once Firebase is configured.'
                : 'Use email and password or continue with Google through Firebase Authentication.'}
            </p>
          </div>

          <div className={`mt-6 rounded-[28px] border px-4 py-4 sm:px-5 ${backendStatusTone}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.06)]">
                  {backendState.status === 'checking' ? (
                    <LoaderCircle className="size-5 animate-spin text-[color:var(--accent)]" />
                  ) : (
                    <Server className="size-5 text-[color:var(--accent)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">Backend status</p>
                  <p className="mt-1 text-sm leading-7 text-[color:var(--muted)]">
                    {backendState.detail}
                  </p>
                </div>
              </div>

              <button
                className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--line)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-white/5"
                onClick={() => void checkBackendStatus()}
                type="button"
              >
                <RefreshCw className="size-4" />
                Retry
              </button>
            </div>

            {backendState.status === 'offline' && (
              <p className="mt-4 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-xs leading-6 text-[color:var(--muted)]">
                Run <span className="font-semibold text-[color:var(--text)]">npm run dev:offline</span> for
                local demo mode, <span className="font-semibold text-[color:var(--text)]">npm run dev:online</span>
                {' '}for connected local mode, or point <span className="font-semibold text-[color:var(--text)]">VITE_API_BASE_URL</span>
                {' '}at your hosted backend.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-full border border-[color:var(--line)] p-1">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-[rgba(255,255,255,0.03)] p-1">
              {(['login', 'signup'] as AuthMode[]).map((tab) => (
                <button
                  key={tab}
                  className={`rounded-full px-4 py-3 text-sm font-medium capitalize transition ${
                    mode === tab
                      ? 'bg-[linear-gradient(135deg,var(--accent),var(--sun))] text-slate-950'
                      : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'
                  }`}
                  onClick={() => setMode(tab)}
                  type="button"
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleEmailAuth}>
            {mode === 'signup' && (
              <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
                Full name
                <input
                  autoComplete="name"
                  className="rounded-[22px] border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  type="text"
                  value={displayName}
                />
              </label>
            )}
            <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
              Email
              <input
                autoComplete="email"
                className="rounded-[22px] border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@example.com"
                type="email"
                value={email}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
              Password
              <input
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="rounded-[22px] border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                type="password"
                value={password}
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-[rgba(255,181,155,0.26)] bg-[rgba(255,181,155,0.08)] px-4 py-3 text-sm leading-7 text-[#ffc9b7]">
                {error}
              </div>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,var(--accent),var(--sun))] px-5 py-3.5 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitLabel}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
            <div className="h-px flex-1 bg-[color:var(--line)]" />
            or continue with
            <div className="h-px flex-1 bg-[color:var(--line)]" />
          </div>

          <button
            className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-[color:var(--line)] px-5 py-3.5 text-sm font-medium text-[color:var(--text)] transition hover:border-[color:var(--line-strong)] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting || !googleAuthAvailable}
            onClick={() => void handleGoogle()}
            type="button"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-[rgba(255,255,255,0.08)] text-sm font-semibold">
              G
            </span>
            {googleAuthAvailable ? 'Continue with Google' : 'Google setup required'}
          </button>

          <div className="mt-3 rounded-[24px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm leading-7 text-[color:var(--muted)]">
            {googleAuthAvailable
              ? 'Google sign-in is ready on the frontend. If the popup is blocked, the app will fall back to a redirect flow automatically. Keep AI_STUDY_FIREBASE_PROJECT_ID in backend/.env aligned with the same Firebase project.'
              : `${authSetupMessage ?? 'Add the Firebase web app values to frontend/.env.'} Also set AI_STUDY_FIREBASE_PROJECT_ID in backend/.env so the API can verify Firebase tokens.`}
          </div>
        </motion.section>

        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="auth-aurora panel-strong order-2 relative overflow-hidden rounded-[32px] p-6 sm:p-8 lg:order-1 lg:rounded-[36px] lg:p-12"
          initial={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="mesh-orb right-16 top-10 size-24 bg-[rgba(82,246,213,0.16)]" />
          <div className="mesh-orb bottom-10 left-12 size-28 bg-[rgba(248,195,108,0.16)]" />

          <div className="relative max-w-xl">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.34em] text-[color:var(--muted)]">
              <Sparkles className="size-4 text-[color:var(--accent)]" />
              AI Study Assistant
            </div>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--text)] sm:text-5xl">
              A calmer, clearer study interface for chat, notes, and revision.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-8 text-[color:var(--muted)]">
              Keep your questions, summaries, and saved notes in one place instead of hopping
              between tabs. The interface is tuned to stay readable and usable on both desktop
              and smaller screens.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                {
                  icon: BrainCircuit,
                  title: 'Context-aware AI',
                  text: 'Multi-chat memory that keeps the thread of your study session intact.',
                },
                {
                  icon: BookOpenText,
                  title: 'Revision notes',
                  text: 'Save strong answers into notes you can search and reuse later.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Safer access',
                  text: 'Demo auth locally, Firebase auth when your project configuration is ready.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[28px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.04)] p-4"
                >
                  <feature.icon className="size-5 text-[color:var(--accent)]" />
                  <h3 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[color:var(--text)]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[28px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Current project mode
              </p>
              <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[color:var(--text)]">
                {demoMode ? 'Local demo sign-in is active.' : 'Firebase sign-in is active.'}
              </p>
              <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                {backendState.health
                  ? `The backend reported ${backendState.health.storage} storage with ${backendState.health.ai} AI mode.`
                  : 'Once the backend is reachable, the workspace can load your chats, notes, and settings.'}
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
