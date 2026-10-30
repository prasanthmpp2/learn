from functools import lru_cache
import json
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
  app_name: str = 'AI Study Assistant API'
  api_prefix: str = '/api'
  environment: Literal['development', 'production', 'test'] = 'development'
  cors_origins: list[str] = Field(
    default_factory=lambda: [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]
  )
  data_backend: Literal['memory', 'firestore'] = 'memory'
  auth_mode: Literal['auto', 'demo', 'firebase'] = 'auto'
  gemini_api_key: str | None = None
  gemini_model: str = 'gemini-3.5-flash-lite'
  gemini_fallback_models: list[str] = Field(
    default_factory=lambda: ['gemini-3.6-flash', 'gemini-3.8-flash']
  )
  gemini_timeout_seconds: int = 25
  # Groq is used when Gemini cannot answer the request.
  groq_api_key: str | None = None
  groq_model: str = 'openai/gpt-oss-20b'
  groq_timeout_seconds: int = 15
  firebase_project_id: str | None = None
  firebase_client_email: str | None = None
  firebase_private_key: str | None = None
  firebase_storage_bucket: str | None = None
  firebase_credentials_path: str | None = None

  model_config = SettingsConfigDict(
    case_sensitive=False,
    env_file='.env',
    env_prefix='AI_STUDY_',
    extra='ignore',
  )

  @field_validator('cors_origins', mode='before')
  @classmethod
  def validate_cors_origins(cls, value: list[str] | str) -> list[str]:
    if isinstance(value, str):
      stripped = value.strip()
      if not stripped:
        return []

      if stripped.startswith('['):
        return json.loads(stripped)

      return [origin.strip() for origin in stripped.split(',') if origin.strip()]

    return value

  @field_validator('gemini_fallback_models', mode='before')
  @classmethod
  def validate_gemini_fallback_models(cls, value: list[str] | str) -> list[str]:
    if isinstance(value, str):
      return [model.strip() for model in value.split(',') if model.strip()]
    return value

  @property
  def firebase_enabled(self) -> bool:
    if self.firebase_credentials_path:
      return True

    return bool(
      self.firebase_project_id
      and self.firebase_client_email
      and self.firebase_private_key
    )

  @property
  def normalized_firebase_private_key(self) -> str | None:
    if not self.firebase_private_key:
      return None

    return self.firebase_private_key.replace('\\n', '\n')

  @property
  def ai_enabled(self) -> bool:
    return bool(self.gemini_api_key)


@lru_cache
def get_settings() -> Settings:
  return Settings()
