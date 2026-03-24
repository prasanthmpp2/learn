from abc import ABC, abstractmethod
from datetime import datetime, timezone
import re

from app.models.schemas import (
  AuthenticatedUser,
  ChatSession,
  Message,
  Note,
  Preferences,
)


def utc_now_iso() -> str:
  return datetime.now(timezone.utc).isoformat()


def build_chat_title(message: str) -> str:
  stripped = re.sub(r'\s+', ' ', message).strip()
  if not stripped:
    return 'New Chat'

  words = stripped.split(' ')
  title = ' '.join(words[:7])
  return title[:60].strip()


class BaseRepository(ABC):
  @abstractmethod
  def reset(self) -> None:
    raise NotImplementedError

  @abstractmethod
  def upsert_user(
    self,
    user: AuthenticatedUser,
    preferences: Preferences | None = None,
  ) -> tuple[AuthenticatedUser, Preferences]:
    raise NotImplementedError

  @abstractmethod
  def get_profile(self, user_id: str) -> tuple[AuthenticatedUser, Preferences]:
    raise NotImplementedError

  @abstractmethod
  def update_preferences(self, user_id: str, preferences: Preferences) -> Preferences:
    raise NotImplementedError

  @abstractmethod
  def list_chats(self, user_id: str) -> list[ChatSession]:
    raise NotImplementedError

  @abstractmethod
  def get_chat(self, user_id: str, chat_id: str) -> ChatSession | None:
    raise NotImplementedError

  @abstractmethod
  def create_chat(
    self,
    user_id: str,
    title: str,
    last_message_preview: str = '',
  ) -> ChatSession:
    raise NotImplementedError

  @abstractmethod
  def update_chat_metadata(
    self,
    user_id: str,
    chat_id: str,
    *,
    title: str | None = None,
    last_message_preview: str | None = None,
  ) -> ChatSession:
    raise NotImplementedError

  @abstractmethod
  def delete_chat(self, user_id: str, chat_id: str) -> None:
    raise NotImplementedError

  @abstractmethod
  def list_messages(self, user_id: str, chat_id: str) -> list[Message]:
    raise NotImplementedError

  @abstractmethod
  def create_message(
    self,
    chat_id: str,
    user_id: str,
    role: str,
    content: str,
  ) -> Message:
    raise NotImplementedError

  @abstractmethod
  def delete_last_assistant_message(
    self,
    user_id: str,
    chat_id: str,
  ) -> Message | None:
    raise NotImplementedError

  @abstractmethod
  def set_message_feedback(
    self,
    user_id: str,
    message_id: str,
    feedback: str | None,
  ) -> Message:
    raise NotImplementedError

  @abstractmethod
  def create_note(
    self,
    user_id: str,
    question: str,
    answer: str,
    source_chat_id: str | None = None,
    source_message_id: str | None = None,
  ) -> Note:
    raise NotImplementedError

  @abstractmethod
  def list_notes(self, user_id: str) -> list[Note]:
    raise NotImplementedError

  @abstractmethod
  def delete_note(self, user_id: str, note_id: str) -> None:
    raise NotImplementedError
