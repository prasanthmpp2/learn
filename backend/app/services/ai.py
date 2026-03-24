from __future__ import annotations

import logging
import re

from app.core.config import Settings
from app.core.prompt import build_contextual_prompt, build_offline_response, resolve_offline_guide
from app.models.schemas import HistoryItem, Message, Note, Preferences

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional runtime dependency
  from google import genai
except ImportError:  # pragma: no cover - optional runtime dependency
  genai = None


class AIService:
  def __init__(self, settings: Settings) -> None:
    self.settings = settings
    self.client = None

    if settings.ai_enabled and genai:
      try:
        self.client = genai.Client(api_key=settings.gemini_api_key)
      except Exception:  # pragma: no cover - depends on environment credentials
        logger.exception('Gemini client initialization failed. Falling back to offline mode.')

  def generate_response(
    self,
    question: str,
    history: list[HistoryItem],
    preferences: Preferences,
    *,
    notes: list[Note] | None = None,
    recent_messages: list[Message] | None = None,
  ) -> str:
    relevant_note_context = select_relevant_notes(question, notes or [])
    adaptation_instruction = build_adaptation_instruction(recent_messages or [])

    if not question.strip():
      return build_offline_response(
        question,
        preferences,
        history,
        note_context=relevant_note_context,
        adaptation_instruction=adaptation_instruction,
      )

    if not self.client:
      return build_offline_response(
        question,
        preferences,
        history,
        note_context=relevant_note_context,
        adaptation_instruction=adaptation_instruction,
      )

    prompt = build_contextual_prompt(
      question,
      history,
      preferences,
      note_context=relevant_note_context,
      adaptation_instruction=adaptation_instruction,
    )

    try:
      response = self.client.models.generate_content(
        model=self.settings.gemini_model,
        contents=prompt,
      )
      text = getattr(response, 'text', None)
      if text and text.strip():
        return text.strip()
    except Exception:  # pragma: no cover - network/runtime dependent
      logger.exception('Gemini generation failed. Falling back to offline response.')

    return build_offline_response(
      question,
      preferences,
      history,
      note_context=relevant_note_context,
      adaptation_instruction=adaptation_instruction,
    )


STOPWORDS = {
  'about',
  'after',
  'also',
  'and',
  'are',
  'can',
  'does',
  'explain',
  'for',
  'from',
  'how',
  'into',
  'mean',
  'need',
  'please',
  'that',
  'the',
  'their',
  'them',
  'this',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
}


def extract_keywords(text: str) -> set[str]:
  return {
    token
    for token in re.findall(r'[a-z0-9]+', text.lower())
    if len(token) >= 2 and token not in STOPWORDS
  }


def select_relevant_notes(question: str, notes: list[Note], limit: int = 3) -> list[str]:
  question_keywords = extract_keywords(question)
  _, resolved_topic = resolve_offline_guide(question)
  if resolved_topic:
    question_keywords |= extract_keywords(resolved_topic)
  if not notes or not question_keywords:
    return []

  scored_notes: list[tuple[int, Note]] = []
  for note in notes:
    note_text = f'{note.question} {note.answer[:240]}'
    note_keywords = extract_keywords(note_text)
    overlap = question_keywords & note_keywords
    if overlap:
      score = len(overlap) * 3
      if note.question.lower() in question.lower():
        score += 2
      scored_notes.append((score, note))

  scored_notes.sort(key=lambda item: (item[0], item[1].created_at), reverse=True)
  selected_notes = [note for _, note in scored_notes[:limit]]

  return [
    f"{note.question}: {compact_text(note.answer, 180)}"
    for note in selected_notes
  ]


def compact_text(value: str, limit: int) -> str:
  compact = re.sub(r'\s+', ' ', value).strip()
  if len(compact) <= limit:
    return compact
  return f'{compact[:limit].rstrip()}...'


def build_adaptation_instruction(recent_messages: list[Message]) -> str:
  liked = sum(message.feedback == 'like' for message in recent_messages)
  disliked = sum(message.feedback == 'dislike' for message in recent_messages)

  if disliked > liked:
    return (
      'Recent feedback suggests the student wants more direct, specific, example-based answers. '
      'Avoid filler, answer the exact question first, and keep explanations concrete.'
    )

  if liked > disliked:
    return (
      'Recent feedback suggests the current structured style is working. '
      'Keep answers direct, organized, and useful for revision.'
    )

  return (
    'Default to direct, specific answers that define the exact term first and then add only the most relevant detail.'
  )
