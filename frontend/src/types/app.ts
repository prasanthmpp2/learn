export type MessageRole = 'user' | 'assistant'
export type ThemeMode = 'dark' | 'light'
export type AnswerLength = 'brief' | 'balanced' | 'deep'
export type FeedbackValue = 'like' | 'dislike' | null

export interface StudyPreferences {
  theme: ThemeMode
  language: string
  answerLength: AnswerLength
}

export interface AuthUser {
  uid: string
  email: string
  displayName: string
  photoURL?: string | null
}

export interface ChatSession {
  id: string
  userId: string
  title: string
  createdAt: string
  updatedAt: string
  lastMessagePreview: string
}

export interface ChatMessage {
  id: string
  chatId: string
  userId: string
  role: MessageRole
  content: string
  createdAt: string
  feedback?: FeedbackValue
}

export interface StudyNote {
  id: string
  userId: string
  question: string
  answer: string
  sourceChatId?: string | null
  sourceMessageId?: string | null
  createdAt: string
}

export interface AskPayload {
  chatId?: string | null
  message: string
  history?: Array<Pick<ChatMessage, 'role' | 'content'>>
  regenerate?: boolean
  preferences?: StudyPreferences
}

export interface AskResponse {
  chat: ChatSession
  userMessage?: ChatMessage
  assistantMessage: ChatMessage
  messages: ChatMessage[]
}

export interface SaveNotePayload {
  chatId?: string | null
  messageId?: string | null
  question: string
  answer: string
}

export interface ApiAuth {
  token: string | null
  demoUserId?: string | null
  email?: string | null
  displayName?: string | null
}
