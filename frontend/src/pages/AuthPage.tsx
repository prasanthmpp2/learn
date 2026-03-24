import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpenText, BrainCircuit, ShieldCheck } from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth.ts'

type AuthMode = 'login' | 'signup'

export function AuthPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { demoMode, loading, login, loginWithGoogle, signup, user } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('student@example.com')
  const [password, setPassword] = useState('study1234')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const nextPath = (location.state as { from?: string } | null)?.from ?? '/chats'

  useEffect(() => {
    if (user) {
      navigate(nextPath, { replace: true })
    }
  }, [nextPath, navigate, user])

  if (loading) {
    return null
  }

  if (user) {
    return <Navigate to={nextPath} replace />
  }

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await signup(email, password)
      }
    } catch {
      setError(mode === 'login' ? 'Invalid credentials. Please try again.' : 'Could not create your account right now.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogle = async () => {
    setSubmitting(true)
    setError(null)

    try {
      await loginWithGoogle()
    } catch {
      setError('Google sign-in is unavailable at the moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="mesh-orb left-[-4rem] top-[-3rem] size-56 bg-[rgba(82,246,213,0.16)]" />
      <div className="mesh-orb bottom-[-6rem] right-[-3rem] size-72 bg-[rgba(248,195,108,0.14)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-stretch gap-6 lg:grid-cols-[1.15fr_0.95fr]">
        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="auth-aurora panel-surface relative overflow-hidden rounded-[36px] p-8 sm:p-10 lg:p-12"
          initial={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="mesh-orb right-16 top-10 size-24 bg-[rgba(82,246,213,0.16)]" />
          <div className="mesh-orb bottom-10 left-12 size-28 bg-[rgba(248,195,108,0.16)]" />

          <div className="relative max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[color:var(--muted)]">
              AI Study Assistant
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--text)] sm:text-5xl">
              Your central workspace for asking, revising, and remembering.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-8 text-[color:var(--muted)]">
              Study like you are working with a calm, structured tutor. Keep chats,
              save revision notes, and build context over time instead of starting over.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: BrainCircuit,
                  title: 'Context-aware AI',
                  text: 'Multi-chat memory that follows your study thread.',
                },
                {
                  icon: BookOpenText,
                  title: 'Revision notes',
                  text: 'Save strong answers into reusable notes in one click.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Secure access',
                  text: 'Firebase-ready auth with protected study spaces.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-[28px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <feature.icon className="size-5 text-[color:var(--accent)]" />
                  <h2 className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[color:var(--text)]">
                    {feature.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                    {feature.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          animate={{ opacity: 1, x: 0 }}
          className="panel-surface flex flex-col justify-center rounded-[36px] p-6 sm:p-8 lg:p-10"
          initial={{ opacity: 0, x: 18 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.08 }}
        >
          <div className="rounded-full border border-[color:var(--line)] p-1">
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

          <div className="mt-8">
            <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--muted)]">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text)]">
              {mode === 'login' ? 'Continue your study flow' : 'Start your AI workspace'}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              {demoMode
                ? 'Firebase env vars are not configured, so this screen uses demo auth locally.'
                : 'Use email and password or continue with Google through Firebase Authentication.'}
            </p>
          </div>

          <form className="mt-8 space-y-4" onSubmit={handleEmailAuth}>
            <label className="flex flex-col gap-2 text-sm text-[color:var(--muted)]">
              Email
              <input
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
                className="rounded-[22px] border border-[color:var(--line)] bg-transparent px-4 py-3 text-[color:var(--text)] outline-none placeholder:text-[color:var(--muted)]"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type="password"
                value={password}
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-[rgba(255,181,155,0.26)] bg-[rgba(255,181,155,0.08)] px-4 py-3 text-sm text-[#ffc9b7]">
                {error}
              </div>
            )}

            <button
              className="flex w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,var(--accent),var(--sun))] px-5 py-3.5 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {mode === 'login' ? 'Login' : 'Sign up'}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-[color:var(--muted)]">
            <div className="h-px flex-1 bg-[color:var(--line)]" />
            or
            <div className="h-px flex-1 bg-[color:var(--line)]" />
          </div>

          <button
            className="rounded-[22px] border border-[color:var(--line)] px-5 py-3.5 text-sm font-medium text-[color:var(--text)] transition hover:border-[color:var(--line-strong)] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            onClick={() => void handleGoogle()}
            type="button"
          >
            Continue with Google
          </button>
        </motion.section>
      </div>
    </div>
  )
}
