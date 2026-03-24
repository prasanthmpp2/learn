from fastapi import HTTPException

from app.core.auth import AuthService
from app.core.config import Settings


def test_to_authenticated_user_accepts_user_id_claim() -> None:
  auth_service = AuthService(Settings(auth_mode='demo'))

  user = auth_service._to_authenticated_user({
    'user_id': 'firebase-user-123',
    'email': 'student@example.com',
    'name': 'Student',
  })

  assert user.uid == 'firebase-user-123'
  assert user.email == 'student@example.com'
  assert user.display_name == 'Student'


def test_to_authenticated_user_requires_any_user_id_claim() -> None:
  auth_service = AuthService(Settings(auth_mode='demo'))

  try:
    auth_service._to_authenticated_user({'email': 'student@example.com'})
  except HTTPException as exc:
    assert exc.status_code == 401
    assert exc.detail == 'Authentication token is missing a user id.'
  else:  # pragma: no cover - explicit failure path
    raise AssertionError('Expected missing user id claim to raise HTTPException.')
