from fastapi.testclient import TestClient

from app.core.dependencies import get_repository
from app.main import app

client = TestClient(app)


def demo_headers() -> dict[str, str]:
  return {
    'Authorization': 'Bearer demo-student-demo',
    'x-demo-user': 'student-demo',
    'x-demo-email': 'student@example.com',
    'x-demo-name': 'Student Demo',
  }


def setup_function() -> None:
  get_repository().reset()


def test_chat_and_notes_flow() -> None:
  headers = demo_headers()

  ask_response = client.post(
    '/api/ask',
    json={'message': "Explain Newton's second law simply."},
    headers=headers,
  )
  assert ask_response.status_code == 200
  ask_payload = ask_response.json()
  chat_id = ask_payload['chat']['id']
  assistant_message_id = ask_payload['assistantMessage']['id']

  chats_response = client.get('/api/chats', headers=headers)
  assert chats_response.status_code == 200
  assert len(chats_response.json()['chats']) == 1

  messages_response = client.get(
    f'/api/messages?chatId={chat_id}',
    headers=headers,
  )
  assert messages_response.status_code == 200
  assert len(messages_response.json()['messages']) == 2

  note_response = client.post(
    '/api/save-note',
    json={
      'chatId': chat_id,
      'messageId': assistant_message_id,
      'question': "What is Newton's second law?",
      'answer': ask_payload['assistantMessage']['content'],
    },
    headers=headers,
  )
  assert note_response.status_code == 200

  notes_response = client.get('/api/notes', headers=headers)
  assert notes_response.status_code == 200
  assert len(notes_response.json()['notes']) == 1

  delete_response = client.delete(f'/api/chat/{chat_id}', headers=headers)
  assert delete_response.status_code == 204


def test_preferences_round_trip() -> None:
  headers = demo_headers()
  update_response = client.patch(
    '/api/preferences',
    json={
      'theme': 'light',
      'language': 'Tamil',
      'answerLength': 'brief',
    },
    headers=headers,
  )
  assert update_response.status_code == 200
  assert update_response.json()['preferences']['theme'] == 'light'

  profile_response = client.get('/api/profile', headers=headers)
  assert profile_response.status_code == 200
  assert profile_response.json()['preferences']['language'] == 'Tamil'
