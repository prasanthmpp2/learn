from __future__ import annotations

import logging

from fastapi import HTTPException, status

from app.core.config import Settings
from app.models.schemas import AuthenticatedUser

logger = logging.getLogger(__name__)

try:
  import firebase_admin
  from firebase_admin import auth as firebase_auth
  from firebase_admin import credentials
except ImportError:  # pragma: no cover - optional dependency at runtime
  firebase_admin = None
  firebase_auth = None
  credentials = None

try:  # pragma: no cover - optional runtime dependency
  from google.auth.transport import requests as google_auth_requests
  from google.oauth2 import id_token as google_id_token
except ImportError:  # pragma: no cover - optional dependency at runtime
  google_auth_requests = None
  google_id_token = None


class AuthService:
  def __init__(self, settings: Settings) -> None:
    self.settings = settings
    self.firebase_app = self._initialize_firebase()

  def _initialize_firebase(self):
    if not firebase_admin or not credentials:
      return None

    if self.settings.auth_mode == 'demo' and not self.settings.firebase_enabled:
      return None

    try:
      return firebase_admin.get_app()
    except ValueError:
      pass

    try:
      if self.settings.firebase_credentials_path:
        cred = credentials.Certificate(self.settings.firebase_credentials_path)
      elif self.settings.firebase_enabled:
        service_account = {
          'client_email': self.settings.firebase_client_email,
          'private_key': self.settings.normalized_firebase_private_key,
          'project_id': self.settings.firebase_project_id,
          'token_uri': 'https://oauth2.googleapis.com/token',
          'type': 'service_account',
        }
        cred = credentials.Certificate(service_account)
      else:
        cred = credentials.ApplicationDefault()

      options: dict[str, str] = {}
      if self.settings.firebase_project_id:
        options['projectId'] = self.settings.firebase_project_id
      if self.settings.firebase_storage_bucket:
        options['storageBucket'] = self.settings.firebase_storage_bucket

      return firebase_admin.initialize_app(cred, options)
    except Exception:  # pragma: no cover - depends on environment credentials
      logger.exception('Firebase initialization failed, demo auth will remain available.')
      return None

  def authenticate(
    self,
    authorization: str | None,
    demo_user_id: str | None,
    demo_email: str | None,
    demo_name: str | None,
  ) -> AuthenticatedUser:
    token = self._extract_bearer_token(authorization)
    demo_user = self._resolve_demo_user(token, demo_user_id, demo_email, demo_name)

    if self.settings.auth_mode == 'demo':
      if not demo_user:
        raise HTTPException(
          status_code=status.HTTP_401_UNAUTHORIZED,
          detail='Missing demo authentication headers.',
        )
      return demo_user

    if self.settings.auth_mode == 'firebase' and token and token.startswith('demo-'):
      raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Demo authentication is disabled in Firebase auth mode.',
      )

    if token and self.firebase_app and firebase_auth and not token.startswith('demo-'):
      try:
        decoded = firebase_auth.verify_id_token(token, app=self.firebase_app)
        return self._to_authenticated_user(decoded)
      except Exception:
        logger.exception('Firebase token verification failed.')
        if self.settings.auth_mode == 'firebase':
          raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Invalid authentication token.',
          ) from None

    if token and self.settings.firebase_project_id and not token.startswith('demo-'):
      decoded = self._verify_with_google_public_keys(token)
      if decoded:
        return self._to_authenticated_user(decoded)

    if demo_user:
      return demo_user

    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail='Authentication required.',
    )

  @staticmethod
  def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
      return None

    scheme, _, token = authorization.partition(' ')
    if scheme.lower() != 'bearer' or not token:
      return None

    return token.strip()

  @staticmethod
  def _resolve_demo_user(
    token: str | None,
    demo_user_id: str | None,
    demo_email: str | None,
    demo_name: str | None,
  ) -> AuthenticatedUser | None:
    resolved_user_id = demo_user_id
    if not resolved_user_id and token and token.startswith('demo-'):
      resolved_user_id = token.removeprefix('demo-')

    if not resolved_user_id:
      return None

    email = demo_email or f'{resolved_user_id}@demo.local'
    display_name = demo_name or email.split('@')[0].replace('-', ' ').title()
    return AuthenticatedUser(
      uid=resolved_user_id,
      email=email,
      display_name=display_name,
    )

  def _verify_with_google_public_keys(self, token: str) -> dict | None:
    if not google_auth_requests or not google_id_token or not self.settings.firebase_project_id:
      return None

    try:
      request = google_auth_requests.Request()
      decoded = google_id_token.verify_firebase_token(token, request)
      if not decoded:
        return None

      project_id = self.settings.firebase_project_id
      expected_issuer = f'https://securetoken.google.com/{project_id}'
      if decoded.get('aud') != project_id or decoded.get('iss') != expected_issuer:
        raise ValueError('Token audience or issuer does not match the Firebase project.')

      return decoded
    except Exception:
      logger.exception('Public-key Firebase token verification failed.')
      if self.settings.auth_mode == 'firebase':
        raise HTTPException(
          status_code=status.HTTP_401_UNAUTHORIZED,
          detail='Invalid authentication token.',
        ) from None
      return None

  @staticmethod
  def _to_authenticated_user(decoded: dict) -> AuthenticatedUser:
    uid = decoded.get('uid') or decoded.get('user_id') or decoded.get('sub')
    if not uid:
      raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Authentication token is missing a user id.',
      )

    email = str(decoded.get('email', 'student@example.com'))
    return AuthenticatedUser(
      uid=str(uid),
      email=email,
      display_name=str(decoded.get('name') or email.split('@')[0]),
      photo_url=decoded.get('picture'),
    )
