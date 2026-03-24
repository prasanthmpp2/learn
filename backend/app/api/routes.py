from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.core.dependencies import (
  get_chat_service,
  get_current_user,
  get_repository,
  get_runtime_settings,
)
from app.models.schemas import (
  AskRequest,
  AskResponse,
  ChatListResponse,
  ChatResponse,
  FeedbackRequest,
  HealthResponse,
  MessageListResponse,
  MessageResponse,
  NoteListResponse,
  NoteResponse,
  Preferences,
  PreferencesResponse,
  ProfileResponse,
  RenameChatRequest,
  SaveNoteRequest,
)
from app.repositories.base import BaseRepository
from app.services.chat import ChatService

router = APIRouter()


@router.get('/health', response_model=HealthResponse)
def health_check(settings=Depends(get_runtime_settings)) -> HealthResponse:
  return HealthResponse(
    status='ok',
    storage=settings.data_backend,
    ai='gemini' if settings.ai_enabled else 'offline',
  )


@router.get('/profile', response_model=ProfileResponse)
def get_profile(
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> ProfileResponse:
  user, preferences = repository.upsert_user(current_user)
  return ProfileResponse(user=user, preferences=preferences)


@router.patch('/preferences', response_model=PreferencesResponse)
def update_preferences(
  payload: Preferences,
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> PreferencesResponse:
  repository.upsert_user(current_user)
  preferences = repository.update_preferences(current_user.uid, payload)
  return PreferencesResponse(preferences=preferences)


@router.get('/chats', response_model=ChatListResponse)
def list_chats(
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> ChatListResponse:
  repository.upsert_user(current_user)
  return ChatListResponse(chats=repository.list_chats(current_user.uid))


@router.get('/messages', response_model=MessageListResponse)
def list_messages(
  chat_id: str = Query(..., alias='chatId'),
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> MessageListResponse:
  repository.upsert_user(current_user)
  chat = repository.get_chat(current_user.uid, chat_id)
  if not chat:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')
  return MessageListResponse(
    chat=chat,
    messages=repository.list_messages(current_user.uid, chat_id),
  )


@router.post('/ask', response_model=AskResponse)
def ask_question(
  payload: AskRequest,
  current_user = Depends(get_current_user),
  chat_service: ChatService = Depends(get_chat_service),
) -> AskResponse:
  return chat_service.ask(current_user, payload)


@router.get('/ask', response_model=AskResponse)
def ask_question_via_get(
  message: str,
  chat_id: str | None = Query(None, alias='chatId'),
  regenerate: bool = False,
  current_user = Depends(get_current_user),
  chat_service: ChatService = Depends(get_chat_service),
) -> AskResponse:
  return chat_service.ask(
    current_user,
    AskRequest(chat_id=chat_id, message=message, regenerate=regenerate),
  )


@router.post('/save-note', response_model=NoteResponse)
def save_note(
  payload: SaveNoteRequest,
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> NoteResponse:
  repository.upsert_user(current_user)
  if payload.chat_id and not repository.get_chat(current_user.uid, payload.chat_id):
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Chat not found.')
  note = repository.create_note(
    current_user.uid,
    payload.question,
    payload.answer,
    source_chat_id=payload.chat_id,
    source_message_id=payload.message_id,
  )
  return NoteResponse(note=note)


@router.get('/notes', response_model=NoteListResponse)
def list_notes(
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> NoteListResponse:
  repository.upsert_user(current_user)
  return NoteListResponse(notes=repository.list_notes(current_user.uid))


@router.delete('/notes/{note_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
  note_id: str,
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> Response:
  repository.delete_note(current_user.uid, note_id)
  return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch('/chat/{chat_id}', response_model=ChatResponse)
def rename_chat(
  chat_id: str,
  payload: RenameChatRequest,
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> ChatResponse:
  return ChatResponse(
    chat=repository.update_chat_metadata(
      current_user.uid,
      chat_id,
      title=payload.title,
    )
  )


@router.delete('/chat/{chat_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_chat(
  chat_id: str,
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> Response:
  repository.delete_chat(current_user.uid, chat_id)
  return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post('/messages/{message_id}/feedback', response_model=MessageResponse)
def set_feedback(
  message_id: str,
  payload: FeedbackRequest,
  current_user = Depends(get_current_user),
  repository: BaseRepository = Depends(get_repository),
) -> MessageResponse:
  return MessageResponse(
    message=repository.set_message_feedback(
      current_user.uid,
      message_id,
      payload.feedback,
    )
  )
