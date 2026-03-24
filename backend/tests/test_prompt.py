from app.core.prompt import build_contextual_prompt, build_offline_response
from app.models.schemas import Preferences


def test_offline_response_for_ml_is_topic_aware() -> None:
  response = build_offline_response(
    'what is mean by ml',
    Preferences(theme='dark', language='English', answer_length='balanced'),
    [],
  )

  assert 'Machine Learning (ML)' in response
  assert 'learn patterns from data' in response
  assert 'Focus on idea' not in response
  assert 'offline fallback' not in response


def test_offline_response_for_unknown_topic_is_still_study_friendly() -> None:
  response = build_offline_response(
    'Explain compiler design',
    Preferences(theme='dark', language='English', answer_length='brief'),
    [],
  )

  assert 'Compiler Design' in response
  assert 'Start with a one-sentence definition' in response


def test_contextual_prompt_includes_specificity_and_note_memory() -> None:
  prompt = build_contextual_prompt(
    'what is ml',
    [],
    Preferences(theme='dark', language='English', answer_length='balanced'),
    note_context=['Machine Learning: learn patterns from data to make predictions.'],
    adaptation_instruction='Recent feedback suggests the student wants more direct answers.',
  )

  assert 'Additional answering rules' in prompt
  assert 'expand any abbreviation' in prompt.lower()
  assert 'Relevant saved notes' in prompt
  assert 'Machine Learning: learn patterns from data' in prompt
  assert 'Adaptive style memory' in prompt
