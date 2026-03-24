from __future__ import annotations

from app.models.schemas import AskRequest, AskResponse, AuthenticatedUser, HistoryItem
from app.repositories.base import BaseRepository, build_chat_title
from app.services.ai import AIService


class ChatService:
  def __init__(self, repository: BaseRepository, ai_service: AIService) -> None:
    self.repository = repository
    self.ai_service = ai_service

  def ask(self, user: AuthenticatedUser, payload: AskRequest) -> AskResponse:
    _, stored_preferences = self.repository.upsert_user(user, payload.preferences)
    preferences = payload.preferences or stored_preferences

    chat = (
      self.repository.get_chat(user.uid, payload.chat_id)
      if payload.chat_id
      else None
    )
    if not chat:
      chat = self.repository.create_chat(
        user.uid,
        build_chat_title(payload.message),
      )

    user_message = None
    if payload.regenerate:
      self.repository.delete_last_assistant_message(user.uid, chat.id)
    else:
      user_message = self.repository.create_message(
        chat.id,
        user.uid,
        'user',
        payload.message,
      )

    stored_messages = self.repository.list_messages(user.uid, chat.id)
    stored_history = [
      HistoryItem(role=message.role, content=message.content)
      for message in stored_messages
    ]
    recent_history = stored_history[-10:] or payload.history[-10:]
    saved_notes = self.repository.list_notes(user.uid)[:12]

    assistant_message = self.repository.create_message(
      chat.id,
      user.uid,
      'assistant',
      self.ai_service.generate_response(
        payload.message,
        recent_history,
        preferences,
        notes=saved_notes,
        recent_messages=stored_messages[-12:],
      ),
    )
    chat = self.repository.update_chat_metadata(
      user.uid,
      chat.id,
      last_message_preview=assistant_message.content[:180],
    )

    return AskResponse(
      chat=chat,
      assistant_message=assistant_message,
      messages=self.repository.list_messages(user.uid, chat.id),
      user_message=user_message,
    )
