from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
  parts = value.split('_')
  return parts[0] + ''.join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
  model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class Preferences(CamelModel):
  theme: Literal['dark', 'light'] = 'dark'
  language: str = 'English'
  answer_length: Literal['brief', 'balanced', 'deep'] = 'balanced'


class AuthenticatedUser(CamelModel):
  uid: str
  email: str
  display_name: str
  photo_url: str | None = None


class ChatSession(CamelModel):
  id: str
  user_id: str
  title: str
  created_at: str
  updated_at: str
  last_message_preview: str = ''


class Message(CamelModel):
  id: str
  chat_id: str
  user_id: str
  role: Literal['user', 'assistant']
  content: str
  created_at: str
  feedback: Literal['like', 'dislike'] | None = None


class Note(CamelModel):
  id: str
  user_id: str
  question: str
  answer: str
  source_chat_id: str | None = None
  source_message_id: str | None = None
  created_at: str


class HistoryItem(CamelModel):
  role: Literal['user', 'assistant']
  content: str


class AskRequest(CamelModel):
  chat_id: str | None = None
  message: str = Field(min_length=1)
  history: list[HistoryItem] = Field(default_factory=list)
  regenerate: bool = False
  preferences: Preferences | None = None


class AskResponse(CamelModel):
  chat: ChatSession
  assistant_message: Message
  messages: list[Message]
  user_message: Message | None = None


class ChatListResponse(CamelModel):
  chats: list[ChatSession]


class MessageListResponse(CamelModel):
  chat: ChatSession
  messages: list[Message]


class NoteListResponse(CamelModel):
  notes: list[Note]


class ChatResponse(CamelModel):
  chat: ChatSession


class MessageResponse(CamelModel):
  message: Message


class NoteResponse(CamelModel):
  note: Note


class PreferencesResponse(CamelModel):
  preferences: Preferences


class ProfileResponse(CamelModel):
  user: AuthenticatedUser
  preferences: Preferences


class RenameChatRequest(CamelModel):
  title: str = Field(min_length=1, max_length=100)


class SaveNoteRequest(CamelModel):
  chat_id: str | None = None
  message_id: str | None = None
  question: str = Field(min_length=1)
  answer: str = Field(min_length=1)


class FeedbackRequest(CamelModel):
  feedback: Literal['like', 'dislike'] | None = None


class HealthResponse(CamelModel):
  status: str
  storage: str
  ai: str
