from __future__ import annotations

from uuid import uuid4

from fastapi import HTTPException, status

from app.core.auth import AuthService
from app.models.schemas import (
  AuthenticatedUser,
  ChatSession,
  Message,
  Note,
  Preferences,
)
from app.repositories.base import BaseRepository, utc_now_iso

try:  # pragma: no cover - runtime dependency
  from firebase_admin import firestore
except ImportError:  # pragma: no cover - runtime dependency
  firestore = None


class FirestoreRepository(BaseRepository):
  def __init__(self, auth_service: AuthService) -> None:
    if not auth_service.firebase_app or not firestore:
      raise RuntimeError('Firestore repository requires Firebase Admin credentials.')

    self.db = firestore.client(auth_service.firebase_app)

  def reset(self) -> None:
    return None

  @staticmethod
  def _normalize_timestamp(value: object) -> str:
    if hasattr(value, 'isoformat'):
      return value.isoformat()
    return str(value)

  def _load_document(self, collection: str, document_id: str):
    snapshot = self.db.collection(collection).document(document_id).get()
    if not snapshot.exists:
      return None

    payload = snapshot.to_dict() or {}
    for key, value in list(payload.items()):
      if hasattr(value, 'isoformat'):
        payload[key] = value.isoformat()
    return payload

  def upsert_user(
    self,
    user: AuthenticatedUser,
    preferences: Preferences | None = None,
  ) -> tuple[AuthenticatedUser, Preferences]:
    existing = self._load_document('users', user.uid) or {}
    existing_preferences = Preferences.model_validate(existing.get('preferences', {}))
    resolved_preferences = preferences or existing_preferences

    payload = {
      'createdAt': existing.get('createdAt') or utc_now_iso(),
      'displayName': user.display_name,
      'email': user.email,
      'photoURL': user.photo_url,
      'preferences': resolved_preferences.model_dump(by_alias=True),
      'uid': user.uid,
    }
    self.db.collection('users').document(user.uid).set(payload)
    return user, resolved_preferences

  def get_profile(self, user_id: str) -> tuple[AuthenticatedUser, Preferences]:
    payload = self._load_document('users', user_id)
    if not payload:
      user = AuthenticatedUser(
        uid=user_id,
        email=f'{user_id}@demo.local',
        display_name=user_id.replace('-', ' ').title(),
      )
      preferences = Preferences()
      self.upsert_user(user, preferences)
      return user, preferences

    user = AuthenticatedUser(
      uid=user_id,
      email=payload.get('email', f'{user_id}@demo.local'),
      display_name=payload.get('displayName', user_id.replace('-', ' ').title()),
      photo_url=payload.get('photoURL'),
    )
    preferences = Preferences.model_validate(payload.get('preferences', {}))
    return user, preferences

  def update_preferences(self, user_id: str, preferences: Preferences) -> Preferences:
    user, _ = self.get_profile(user_id)
    self.upsert_user(user, preferences)
    return preferences

  def list_chats(self, user_id: str) -> list[ChatSession]:
    snapshots = self.db.collection('chats').where('userId', '==', user_id).stream()
    chats = [ChatSession.model_validate(snapshot.to_dict() or {}) for snapshot in snapshots]
    return sorted(chats, key=lambda item: item.updated_at, reverse=True)

  def get_chat(self, user_id: str, chat_id: str) -> ChatSession | None:
    payload = self._load_document('chats', chat_id)
    if not payload or payload.get('userId') != user_id:
      return None
    return ChatSession.model_validate(payload)

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
    self.db.collection('chats').document(chat.id).set(chat.model_dump(by_alias=True))
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
    self.db.collection('chats').document(chat.id).set(updated.model_dump(by_alias=True))
    return updated

  def delete_chat(self, user_id: str, chat_id: str) -> None:
    chat = self.get_chat(user_id, chat_id)
    if not chat:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')

    self.db.collection('chats').document(chat_id).delete()
    snapshots = self.db.collection('messages').where('chatId', '==', chat_id).stream()
    for snapshot in snapshots:
      snapshot.reference.delete()

  def list_messages(self, user_id: str, chat_id: str) -> list[Message]:
    if not self.get_chat(user_id, chat_id):
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')

    snapshots = self.db.collection('messages').where('chatId', '==', chat_id).stream()
    messages = [Message.model_validate(snapshot.to_dict() or {}) for snapshot in snapshots]
    return sorted(messages, key=lambda item: item.created_at)

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
    self.db.collection('messages').document(message.id).set(message.model_dump(by_alias=True))
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
      self.db.collection('messages').document(assistant_message.id).delete()
    return assistant_message

  def set_message_feedback(
    self,
    user_id: str,
    message_id: str,
    feedback: str | None,
  ) -> Message:
    payload = self._load_document('messages', message_id)
    if not payload:
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Message not found.',
      )

    message = Message.model_validate(payload)
    if not self.get_chat(user_id, message.chat_id):
      raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Message not found.',
      )

    updated = message.model_copy(update={'feedback': feedback})
    self.db.collection('messages').document(message_id).set(updated.model_dump(by_alias=True))
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
    self.db.collection('notes').document(note.id).set(note.model_dump(by_alias=True))
    return note

  def list_notes(self, user_id: str) -> list[Note]:
    snapshots = self.db.collection('notes').where('userId', '==', user_id).stream()
    notes = [Note.model_validate(snapshot.to_dict() or {}) for snapshot in snapshots]
    return sorted(notes, key=lambda item: item.created_at, reverse=True)

  def delete_note(self, user_id: str, note_id: str) -> None:
    payload = self._load_document('notes', note_id)
    if not payload or payload.get('userId') != user_id:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Note not found.')

    self.db.collection('notes').document(note_id).delete()
