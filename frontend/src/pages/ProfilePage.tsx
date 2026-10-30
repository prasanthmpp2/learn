import { useState } from 'react'
import { BadgeCheck, Fingerprint, Mail, Save, UserRound } from 'lucide-react'
import { useAuth } from '../contexts/useAuth.ts'

export function ProfilePage() {
  const { demoMode, updateDisplayName, user } = useAuth()
  const [name, setName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!user) return null

  const saveName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setNotice(null)
    setError(null)
    try {
      await updateDisplayName(name)
      setNotice('Your profile name has been updated.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="chat-topbar flex shrink-0 items-center justify-between rounded-2xl px-4 py-3">
        <span className="text-sm font-medium text-[color:var(--muted)]">Account settings</span>
      </div>
      <section className="mx-auto w-full max-w-3xl overflow-y-auto pb-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--sun))] text-slate-950">
            <UserRound className="size-7" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--muted)]">Account profile</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[color:var(--text)]">Your profile</h1>
          </div>
        </div>

        <div className="panel-strong rounded-[28px] p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-[color:var(--text)]">Basic information</h2>
          <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">Keep the name shown on your study workspace up to date.</p>

          <form className="mt-6 space-y-5" onSubmit={(event) => void saveName(event)}>
            <label className="block text-sm font-medium text-[color:var(--text)]">
              Display name
              <input autoComplete="name" className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 text-[color:var(--text)] outline-none focus:border-[color:var(--accent)]" onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[color:var(--line)] px-4 py-3">
                <p className="flex items-center gap-2 text-xs text-[color:var(--muted)]"><Mail className="size-3.5" /> Email address</p>
                <p className="mt-2 break-all text-sm text-[color:var(--text)]">{user.email}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] px-4 py-3">
                <p className="flex items-center gap-2 text-xs text-[color:var(--muted)]"><BadgeCheck className="size-3.5" /> Sign-in type</p>
                <p className="mt-2 text-sm text-[color:var(--text)]">{demoMode ? 'Local demo account' : 'Firebase account'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] px-4 py-3">
              <p className="flex items-center gap-2 text-xs text-[color:var(--muted)]"><Fingerprint className="size-3.5" /> Account ID</p>
              <p className="mt-2 break-all font-mono text-xs text-[color:var(--text)]">{user.uid}</p>
            </div>
            {notice && <p className="text-sm text-[color:var(--accent)]" role="status">{notice}</p>}
            {error && <p className="text-sm text-[#ffc9b7]" role="alert">{error}</p>}
            <button className="inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--sun))] px-5 py-3 font-semibold text-slate-950 disabled:opacity-60" disabled={saving || !name.trim() || name.trim() === user.displayName} type="submit">
              <Save className="size-4" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </section>
    </div>
  )
}
