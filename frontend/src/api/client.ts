import type {
  ApiAuth,
  AskPayload,
  AskResponse,
  BackendHealth,
  ChatMessage,
  ChatSession,
  FeedbackValue,
  SaveNotePayload,
  StudyNote,
  StudyPreferences,
} from '../types/app.ts'

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const SAME_ORIGIN_API_BASE_URL = '/api'
const LOCAL_HOSTNAMES = new Set(['127.0.0.1', '0.0.0.0', 'localhost'])

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function parseAbsoluteUrl(value: string | undefined) {
  if (!value || value.startsWith('/')) {
    return null
  }

  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname)
}

function isHostedAppWithLocalApiConfig() {
  if (!configuredApiBaseUrl || typeof window === 'undefined') {
    return false
  }

  const configuredUrl = parseAbsoluteUrl(configuredApiBaseUrl)
  if (!configuredUrl) {
    return false
  }

  return !isLocalHostname(window.location.hostname) && isLocalHostname(configuredUrl.hostname)
}

function shouldPreferSameOriginFallback() {
  if (isHostedAppWithLocalApiConfig()) {
    return true
  }

  if (!configuredApiBaseUrl || typeof window === 'undefined') {
    return false
  }

  return window.location.protocol === 'https:' && configuredApiBaseUrl.startsWith('http://')
}

function getApiBaseUrlCandidates() {
  const candidates = new Set<string>()

  if (shouldPreferSameOriginFallback()) {
    candidates.add(SAME_ORIGIN_API_BASE_URL)
  }

  candidates.add(configuredApiBaseUrl || SAME_ORIGIN_API_BASE_URL)

  if (import.meta.env.DEV) {
    candidates.add(SAME_ORIGIN_API_BASE_URL)
  }

  return [...candidates]
}

function shouldRetryWithNextBaseUrl(response: Response) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''

  return (
    response.status === 404 ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504 ||
    contentType.includes('text/html')
  )
}

async function request<T>(
  path: string,
  auth: ApiAuth | null = null,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')

  if (auth?.token) {
    headers.set('Authorization', `Bearer ${auth.token}`)
  }

  if (auth?.demoUserId) {
    headers.set('x-demo-user', auth.demoUserId)
  }

  if (auth?.email) {
    headers.set('x-demo-email', auth.email)
  }

  if (auth?.displayName) {
    headers.set('x-demo-name', auth.displayName)
  }

  let response: Response | null = null
  let lastTriedBaseUrl: string | null = null

  for (const baseUrl of getApiBaseUrlCandidates()) {
    lastTriedBaseUrl = baseUrl

    try {
      const nextResponse = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
      })

      response = nextResponse
      if (nextResponse.ok || !shouldRetryWithNextBaseUrl(nextResponse)) {
        break
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw error
      }
    }
  }

  if (!response) {
    throw new ApiError(buildNetworkErrorMessage(lastTriedBaseUrl), 0)
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
          message = buildNetworkErrorMessage(lastTriedBaseUrl)
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

function buildNetworkErrorMessage(baseUrl: string | null = null) {
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return 'Could not reach the backend. Open this app through a local or hosted web server instead of file://.'
  }

  if (isHostedAppWithLocalApiConfig()) {
    return `Could not reach the backend. This hosted frontend is still pointing to ${configuredApiBaseUrl}. Set VITE_API_BASE_URL to your deployed backend URL or proxy /api on the same host.`
  }

  if (
    typeof window !== 'undefined'
    && window.location.protocol === 'https:'
    && (baseUrl ?? configuredApiBaseUrl ?? '').startsWith('http://')
  ) {
    return 'Could not reach the backend. The app is on HTTPS but the API URL is HTTP. Use an HTTPS backend URL for production.'
  }

  return 'Could not reach the backend. Start FastAPI on http://127.0.0.1:8000, run npm run dev:online, or set VITE_API_BASE_URL to your deployed backend URL.'
}

function looksLikeBackendUnavailable(status: number, rawBody: string) {
  if (status === 502 || status === 503 || status === 504) {
    return true
  }

  if (status < 500 && status !== 404) {
    return false
  }

  const body = rawBody.toLowerCase()
  return (
    !body.trim()
    || body.includes('bad gateway')
    || body.includes('econnrefused')
    || body.includes('proxy error')
    || body.includes('connection refused')
    || body.includes('target server')
    || body.includes('<!doctype html')
    || body.includes('<html')
  )
}

export const api = {
  getHealth() {
    return request<BackendHealth>('/health')
  },

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

  async askStream(
    auth: ApiAuth,
    payload: AskPayload,
    signal: AbortSignal | undefined,
    onChunk: (text: string) => void,
  ): Promise<AskResponse> {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`)
    if (auth.demoUserId) headers.set('x-demo-user', auth.demoUserId)
    if (auth.email) headers.set('x-demo-email', auth.email)
    if (auth.displayName) headers.set('x-demo-name', auth.displayName)

    let response: Response | null = null
    let lastBaseUrl: string | null = null
    for (const baseUrl of getApiBaseUrlCandidates()) {
      lastBaseUrl = baseUrl
      try {
        response = await fetch(`${baseUrl}/ask/stream`, {
          body: JSON.stringify(payload),
          headers,
          method: 'POST',
          signal,
        })
        if (response.ok || !shouldRetryWithNextBaseUrl(response)) break
      } catch (error) {
        if ((error as Error).name === 'AbortError') throw error
      }
    }
    if (!response) throw new ApiError(buildNetworkErrorMessage(lastBaseUrl), 0)
    if (!response.ok) {
      let message = 'Could not start the AI response.'
      try {
        const body = await response.json() as { detail?: string }
        if (body.detail) message = body.detail
      } catch { /* Keep the readable default message. */ }
      throw new ApiError(message, response.status)
    }
    if (!response.body) throw new ApiError('This browser could not read the streamed AI response.', 0)

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let completed: AskResponse | null = null
    const handleEvent = (rawEvent: string) => {
      const data = rawEvent.split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n')
      if (!data) return
      const event = JSON.parse(data) as { type: string; text?: string; message?: string; response?: AskResponse }
      if (event.type === 'chunk' && event.text) onChunk(event.text)
      if (event.type === 'error') throw new ApiError(event.message ?? 'The AI response failed.', 503)
      if (event.type === 'done' && event.response) completed = event.response
    }

    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      let separator = buffer.indexOf('\n\n')
      while (separator !== -1) {
        handleEvent(buffer.slice(0, separator))
        buffer = buffer.slice(separator + 2)
        separator = buffer.indexOf('\n\n')
      }
      if (done) break
    }
    if (buffer.trim()) handleEvent(buffer)
    if (!completed) throw new ApiError('The AI response ended before it was saved. Please retry.', 503)
    return completed
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
