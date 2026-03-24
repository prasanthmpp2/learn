import type {
  ApiAuth,
  AskPayload,
  AskResponse,
  ChatMessage,
  ChatSession,
  FeedbackValue,
  SaveNotePayload,
  StudyNote,
  StudyPreferences,
} from '../types/app.ts'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = configuredApiBaseUrl || '/api'
const API_BASE_URL_CANDIDATES = import.meta.env.DEV && API_BASE_URL !== '/api'
  ? [API_BASE_URL, '/api']
  : [API_BASE_URL]

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(
  path: string,
  auth: ApiAuth,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (auth.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  if (auth.demoUserId) {
    headers.set('x-demo-user', auth.demoUserId)
  }

  if (auth.email) {
    headers.set('x-demo-email', auth.email)
  }

  if (auth.displayName) {
    headers.set('x-demo-name', auth.displayName)
  }

  let response: Response | null = null

  for (const baseUrl of API_BASE_URL_CANDIDATES) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
      })
      break
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error
      }
    }
  }

  if (!response) {
    throw new ApiError(buildNetworkErrorMessage(), 0)
  }

  if (!response.ok) {
    let message = 'Something went wrong while calling the backend.'
    const fallbackResponse = response.clone()

    try {
      const error = (await response.json()) as { detail?: string }
      if (error.detail) {
        message = error.detail
      }
    } catch {
      try {
        const rawBody = await fallbackResponse.text()
        if (looksLikeBackendUnavailable(response.status, rawBody)) {
          message = 'Could not reach the backend. Start FastAPI on http://127.0.0.1:8000 or run scripts/start-online-local.ps1.'
        }
      } catch {
        // Ignore invalid text error payloads.
      }
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

function buildNetworkErrorMessage() {
  if (
    typeof window !== 'undefined'
    && window.location.protocol === 'https:'
    && API_BASE_URL.startsWith('http://')
  ) {
    return 'Could not reach the backend. The app is on HTTPS but the API URL is HTTP. Use an HTTPS backend URL for production.'
  }

  return 'Could not reach the backend. Start the FastAPI server on http://127.0.0.1:8000 or use the local start scripts.'
}

function looksLikeBackendUnavailable(status: number, rawBody: string) {
  if (!import.meta.env.DEV) {
    return false
  }

  if (status === 502 || status === 503 || status === 504) {
    return true
  }

  if (status < 500) {
    return false
  }

  const body = rawBody.toLowerCase()
  return (
    (API_BASE_URL_CANDIDATES.includes('/api') && !body.trim())
    || body.includes('bad gateway')
    || body.includes('econnrefused')
    || body.includes('proxy error')
    || body.includes('connection refused')
    || body.includes('target server')
  )
}

export const api = {
  getChats(auth: ApiAuth) {
    return request<{ chats: ChatSession[] }>('/chats', auth)
  },

  getMessages(auth: ApiAuth, chatId: string) {
    return request<{ chat: ChatSession; messages: ChatMessage[] }>(
      `/messages?chatId=${encodeURIComponent(chatId)}`,
      auth,
    )
  },

  ask(auth: ApiAuth, payload: AskPayload, signal?: AbortSignal) {
    return request<AskResponse>('/ask', auth, {
      body: JSON.stringify(payload),
      method: 'POST',
      signal,
    })
  },

  saveNote(auth: ApiAuth, payload: SaveNotePayload) {
    return request<{ note: StudyNote }>('/save-note', auth, {
      body: JSON.stringify(payload),
      method: 'POST',
    })
  },

  getNotes(auth: ApiAuth) {
    return request<{ notes: StudyNote[] }>('/notes', auth)
  },

  deleteNote(auth: ApiAuth, noteId: string) {
    return request<void>(`/notes/${encodeURIComponent(noteId)}`, auth, {
      method: 'DELETE',
    })
  },

  deleteChat(auth: ApiAuth, chatId: string) {
    return request<void>(`/chat/${encodeURIComponent(chatId)}`, auth, {
      method: 'DELETE',
    })
  },

  renameChat(auth: ApiAuth, chatId: string, title: string) {
    return request<{ chat: ChatSession }>(
      `/chat/${encodeURIComponent(chatId)}`,
      auth,
      {
        body: JSON.stringify({ title }),
        method: 'PATCH',
      },
    )
  },

  setFeedback(auth: ApiAuth, messageId: string, feedback: FeedbackValue) {
    return request<{ message: ChatMessage }>(
      `/messages/${encodeURIComponent(messageId)}/feedback`,
      auth,
      {
        body: JSON.stringify({ feedback }),
        method: 'POST',
      },
    )
  },

  updatePreferences(auth: ApiAuth, preferences: StudyPreferences) {
    return request<{ preferences: StudyPreferences }>('/preferences', auth, {
      body: JSON.stringify(preferences),
      method: 'PATCH',
    })
  },
}
