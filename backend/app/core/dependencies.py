from __future__ import annotations

import logging
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Header

from app.core.auth import AuthService
from app.core.config import Settings, get_settings
from app.models.schemas import AuthenticatedUser
from app.repositories.base import BaseRepository
from app.repositories.firestore_repo import FirestoreRepository
from app.repositories.in_memory import InMemoryRepository
from app.services.ai import AIService
from app.services.chat import ChatService

logger = logging.getLogger(__name__)


@lru_cache
def get_auth_service() -> AuthService:
  return AuthService(get_settings())


@lru_cache
def get_repository() -> BaseRepository:
  settings = get_settings()
  if settings.data_backend == 'firestore':
    try:
      return FirestoreRepository(get_auth_service())
    except Exception:
      logger.exception('Firestore repository unavailable. Falling back to memory storage.')
  return InMemoryRepository()


@lru_cache
def get_ai_service() -> AIService:
  return AIService(get_settings())


def get_chat_service(
  repository: BaseRepository = Depends(get_repository),
  ai_service: AIService = Depends(get_ai_service),
) -> ChatService:
  return ChatService(repository, ai_service)


def get_current_user(
  auth_service: AuthService = Depends(get_auth_service),
  authorization: Annotated[str | None, Header()] = None,
  x_demo_user: Annotated[str | None, Header()] = None,
  x_demo_email: Annotated[str | None, Header()] = None,
  x_demo_name: Annotated[str | None, Header()] = None,
) -> AuthenticatedUser:
  return auth_service.authenticate(
    authorization=authorization,
    demo_user_id=x_demo_user,
    demo_email=x_demo_email,
    demo_name=x_demo_name,
  )


def get_runtime_settings() -> Settings:
  return get_settings()
