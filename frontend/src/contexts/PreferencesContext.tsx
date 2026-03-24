import {
  createContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import type { StudyPreferences } from '../types/app.ts'

interface PreferencesContextValue {
  preferences: StudyPreferences
  updatePreferences: (next: Partial<StudyPreferences>) => void
}

const defaultPreferences: StudyPreferences = {
  theme: 'dark',
  language: 'English',
  answerLength: 'balanced',
}

const STORAGE_KEY = 'ai-study-assistant-preferences'

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<StudyPreferences>(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return defaultPreferences
    }

    try {
      return {
        ...defaultPreferences,
        ...(JSON.parse(stored) as Partial<StudyPreferences>),
      }
    } catch {
      return defaultPreferences
    }
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    document.documentElement.dataset.theme = preferences.theme
  }, [preferences])

  const updatePreferences = (next: Partial<StudyPreferences>) => {
    setPreferences((current) => ({
      ...current,
      ...next,
    }))
  }

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export { PreferencesContext }
