from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, status

from app.models.schemas import (
  AuthenticatedUser,
  ChatSession,
  Message,
  Note,
  Preferences,
)
from app.repositories.base import BaseRepository, utc_now_iso


class InMemoryRepository(BaseRepository):
  def __init__(self) -> None:
    self.reset()

  def reset(self) -> None:
    self.users: dict[str, dict[str, object]] = {}
    self.chats: dict[str, ChatSession] = {}
    self.messages: dict[str, Message] = {}
    self.notes: dict[str, Note] = {}

  def upsert_user(
    self,
    user: AuthenticatedUser,
    preferences: Preferences | None = None,
  ) -> tuple[AuthenticatedUser, Preferences]:
    stored = self.users.get(user.uid)
    stored_preferences = preferences or (
      stored.get('preferences') if stored else None
    ) or Preferences()

    self.users[user.uid] = {
      'preferences': stored_preferences,
      'user': user,
    }
    return user, stored_preferences

  def get_profile(self, user_id: str) -> tuple[AuthenticatedUser, Preferences]:
    stored = self.users.get(user_id)
    if not stored:
      user = AuthenticatedUser(
        uid=user_id,
        email=f'{user_id}@demo.local',
        display_name=user_id.replace('-', ' ').title(),
      )
      preferences = Preferences()
      self.users[user_id] = {'preferences': preferences, 'user': user}
      return user, preferences

    return stored['user'], stored['preferences']

  def update_preferences(self, user_id: str, preferences: Preferences) -> Preferences:
    user, _ = self.get_profile(user_id)
    self.users[user_id] = {'preferences': preferences, 'user': user}
    return preferences

  def list_chats(self, user_id: str) -> list[ChatSession]:
    return sorted(
      [chat for chat in self.chats.values() if chat.user_id == user_id],
      key=lambda item: item.updated_at,
      reverse=True,
    )

  def get_chat(self, user_id: str, chat_id: str) -> ChatSession | None:
    chat = self.chats.get(chat_id)
    if not chat or chat.user_id != user_id:
      return None

    return chat

  def create_chat(
    self,
    user_id: str,
    title: str,
    last_message_preview: str = '',
  ) -> ChatSession:
    timestamp = utc_now_iso()
    chat = ChatSession(
      id=uuid4().hex,
      user_id=user_id,
      title=title,
      created_at=timestamp,
      updated_at=timestamp,
      last_message_preview=last_message_preview,
    )
    self.chats[chat.id] = chat
    return chat

  def update_chat_metadata(
    self,
    user_id: str,
    chat_id: str,
    *,
    title: str | None = None,
    last_message_preview: str | None = None,
  ) -> ChatSession:
    chat = self.get_chat(user_id, chat_id)
    if not chat:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')

    updated = chat.model_copy(
      update={
        'title': title or chat.title,
        'updated_at': utc_now_iso(),
        'last_message_preview': (
          chat.last_message_preview
          if last_message_preview is None
          else last_message_preview
        ),
      }
    )
    self.chats[chat.id] = updated
    return updated

  def delete_chat(self, user_id: str, chat_id: str) -> None:
    chat = self.get_chat(user_id, chat_id)
    if not chat:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')

    self.chats.pop(chat_id, None)
    self.messages = {
      message_id: message
      for message_id, message in self.messages.items()
      if message.chat_id != chat_id
    }

  def list_messages(self, user_id: str, chat_id: str) -> list[Message]:
    if not self.get_chat(user_id, chat_id):
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')

    return sorted(
      [message for message in self.messages.values() if message.chat_id == chat_id],
      key=lambda item: item.created_at,
    )

  def create_message(
    self,
    chat_id: str,
    user_id: str,
    role: str,
    content: str,
  ) -> Message:
    message = Message(
      id=uuid4().hex,
      chat_id=chat_id,
      user_id=user_id,
      role=role,
      content=content,
      created_at=utc_now_iso(),
    )
    self.messages[message.id] = message
    return message

  def delete_last_assistant_message(
    self,
    user_id: str,
    chat_id: str,
  ) -> Message | None:
    messages = self.list_messages(user_id, chat_id)
    assistant_message = next(
      (message for message in reversed(messages) if message.role == 'assistant'),
      None,
    )
    if assistant_message:
      self.messages.pop(assistant_message.id, None)
    return assistant_message

  def set_message_feedback(
    self,
    user_id: str,
    message_id: str,
    feedback: str | None,
  ) -> Message:
    message = self.messages.get(message_id)
    if not message:
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Message not found.',
      )

    chat = self.get_chat(user_id, message.chat_id)
    if not chat:
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Message not found.',
      )

    updated = message.model_copy(update={'feedback': feedback})
    self.messages[message_id] = updated
    return updated

  def create_note(
    self,
    user_id: str,
    question: str,
    answer: str,
    source_chat_id: str | None = None,
    source_message_id: str | None = None,
  ) -> Note:
    note = Note(
      id=uuid4().hex,
      user_id=user_id,
      question=question,
      answer=answer,
      source_chat_id=source_chat_id,
      source_message_id=source_message_id,
      created_at=utc_now_iso(),
    )
    self.notes[note.id] = note
    return note

  def list_notes(self, user_id: str) -> list[Note]:
    return sorted(
      [note for note in self.notes.values() if note.user_id == user_id],
      key=lambda item: item.created_at,
      reverse=True,
    )

  def delete_note(self, user_id: str, note_id: str) -> None:
    note = self.notes.get(note_id)
    if not note or note.user_id != user_id:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Note not found.')

    self.notes.pop(note_id, None)
