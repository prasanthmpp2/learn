from __future__ import annotations

import logging
import json
import re

import requests

from app.core.config import Settings
from app.core.prompt import build_contextual_prompt, build_offline_response, resolve_offline_guide
from app.models.schemas import HistoryItem, Message, Note, Preferences

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional runtime dependency
  from google import genai
  from google.genai import types
except ImportError:  # pragma: no cover - optional runtime dependency
  genai = None
  types = None


class AIServiceError(RuntimeError):
  """Raised when every configured AI provider fails to produce an answer."""


def is_gemini_quota_error(error: Exception) -> bool:
  code = getattr(error, 'code', None) or getattr(error, 'status_code', None)
  response = getattr(error, 'response', None)
  code = code or getattr(response, 'status_code', None)
  message = str(error).lower()
  return code == 429 or any(term in message for term in (
    'resource_exhausted', 'quota exceeded', 'quota has been exceeded',
    'rate limit exceeded', 'rate_limit_exceeded', 'too many requests',
  ))


def gemini_error_status(error: Exception | None) -> int | None:
  if error is None:
    return None
  code = getattr(error, 'code', None) or getattr(error, 'status_code', None)
  response = getattr(error, 'response', None)
  code = code or getattr(response, 'status_code', None)
  try:
    return int(code) if code is not None else None
  except (TypeError, ValueError):
    return None


class AIService:
  def __init__(self, settings: Settings) -> None:
    self.settings = settings
    self.client = None

    if settings.ai_enabled and genai:
      try:
        http_options = types.HttpOptions(timeout=settings.gemini_timeout_seconds * 1000) if types else None
        self.client = genai.Client(api_key=settings.gemini_api_key, http_options=http_options)
      except Exception:  # pragma: no cover - depends on environment credentials
        logger.exception('Gemini client initialization failed. Falling back to offline mode.')

  def _stream_groq(self, prompt: str):
    if not self.settings.groq_api_key:
      raise AIServiceError(
        'Gemini quota is exhausted, but Groq is not configured. Add AI_STUDY_GROQ_API_KEY to backend/.env.'
      )

    payload = {
      'model': self.settings.groq_model,
      'messages': [{'role': 'user', 'content': prompt}],
      'temperature': 0.2,
      'max_completion_tokens': 1200,
      'stream': True,
    }
    emitted = False
    response = None
    try:
      response = requests.post(
        'https://api.groq.com/openai/v1/chat/completions',
        json=payload,
        headers={'Authorization': f'Bearer {self.settings.groq_api_key}'},
        timeout=(5, self.settings.groq_timeout_seconds),
        stream=True,
      )
      if not response.ok:
        status_code = response.status_code
        provider_message = ''
        try:
          provider_message = str(response.json().get('error', {}).get('message', '')).strip()
        except (ValueError, AttributeError):
          pass
        if status_code == 401:
          detail = 'Groq rejected the API key. Replace AI_STUDY_GROQ_API_KEY in backend/.env.'
        elif status_code == 403:
          detail = 'Groq denied the request. Check Groq organization/project model permissions.'
        elif status_code == 429:
          detail = 'Groq quota or rate limit is exhausted. Check the account quota or try again later.'
        else:
          detail = f'Groq fallback failed with HTTP {status_code}.'
        if provider_message:
          detail = f'{detail} {provider_message}'
        raise AIServiceError(detail)

      for line in response.iter_lines(decode_unicode=True):
        if not line or not line.startswith('data:'):
          continue
        data = line[5:].strip()
        if data == '[DONE]':
          break
        try:
          event = json.loads(data)
        except json.JSONDecodeError:
          continue
        choices = event.get('choices') or []
        delta = choices[0].get('delta', {}) if choices else {}
        text = delta.get('content') if isinstance(delta, dict) else None
        if isinstance(text, str) and text:
          emitted = True
          yield text
    except requests.Timeout as error:
      raise AIServiceError('Groq timed out after the Gemini request failed. Please retry.') from error
    except requests.RequestException as error:
      raise AIServiceError('Could not connect to Groq after the Gemini request failed. Please retry.') from error
    finally:
      if response is not None:
        response.close()

    if not emitted:
      raise AIServiceError('Groq did not return an answer after the Gemini request failed. Please retry.')

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

    prompt = build_contextual_prompt(
      question,
      history,
      preferences,
      note_context=relevant_note_context,
      adaptation_instruction=adaptation_instruction,
    )

    if not self.client:
      if self.settings.groq_api_key:
        logger.warning('Gemini is unavailable; answering with Groq.')
        return normalize_markdown_answer(''.join(self._stream_groq(prompt)))
      return build_offline_response(
        question,
        preferences,
        history,
        note_context=relevant_note_context,
        adaptation_instruction=adaptation_instruction,
      )

    model_names = list(dict.fromkeys([
      self.settings.gemini_model,
      *self.settings.gemini_fallback_models,
    ]))
    last_error: Exception | None = None

    for model_name in model_names:
      try:
        config = types.GenerateContentConfig(
          max_output_tokens={'brief': 600, 'balanced': 1200, 'deep': 2200}[preferences.answer_length],
          thinking_config=types.ThinkingConfig(thinking_level='LOW'),
        ) if types else None
        response = self.client.models.generate_content(
          model=model_name,
          contents=prompt,
          config=config,
        )
        text = getattr(response, 'text', None)
        if text and text.strip():
          if model_name != self.settings.gemini_model:
            logger.warning('Primary Gemini model failed; answered with fallback model %s.', model_name)
          return normalize_markdown_answer(text)
        last_error = RuntimeError(f'{model_name} returned an empty answer')
      except Exception as error:  # pragma: no cover - network/runtime dependent
        last_error = error
        if is_gemini_quota_error(error):
          logger.warning('Gemini quota reached; switching this response to Groq.')
          return normalize_markdown_answer(''.join(self._stream_groq(prompt)))
        logger.warning('Gemini model %s failed.', model_name, exc_info=True)

    logger.error('All configured Gemini models failed: %s', ', '.join(model_names))
    if self.settings.groq_api_key:
      logger.warning('All Gemini models failed; trying Groq as the configured fallback.')
      try:
        return normalize_markdown_answer(''.join(self._stream_groq(prompt)))
      except AIServiceError as groq_error:
        gemini_status = gemini_error_status(last_error)
        gemini_detail = f'Gemini failed with HTTP {gemini_status}' if gemini_status else 'Gemini could not answer'
        raise AIServiceError(
          f'{gemini_detail}; Groq fallback failed: {groq_error}'
        ) from groq_error

    gemini_status = gemini_error_status(last_error)
    if gemini_status in (401, 403):
      raise AIServiceError(
        f'Gemini rejected its API key (HTTP {gemini_status}). Replace AI_STUDY_GEMINI_API_KEY in backend/.env, or configure AI_STUDY_GROQ_API_KEY as fallback.'
      ) from last_error
    raise AIServiceError(
      'Gemini could not answer. Check the Gemini key, model access, and quota; configure AI_STUDY_GROQ_API_KEY in backend/.env for fallback.'
    ) from last_error

  def generate_response_stream(
    self,
    question: str,
    history: list[HistoryItem],
    preferences: Preferences,
    *,
    notes: list[Note] | None = None,
    recent_messages: list[Message] | None = None,
  ):
    relevant_note_context = select_relevant_notes(question, notes or [])
    adaptation_instruction = build_adaptation_instruction(recent_messages or [])
    prompt = build_contextual_prompt(
      question, history, preferences,
      note_context=relevant_note_context,
      adaptation_instruction=adaptation_instruction,
    )

    if not self.client:
      if self.settings.groq_api_key:
        logger.warning('Gemini is unavailable; streaming the answer from Groq.')
        yield from self._stream_groq(prompt)
      else:
        yield build_offline_response(
          question, preferences, history,
          note_context=relevant_note_context,
          adaptation_instruction=adaptation_instruction,
        )
      return

    config = types.GenerateContentConfig(
      max_output_tokens={'brief': 600, 'balanced': 1200, 'deep': 2200}[preferences.answer_length],
      thinking_config=types.ThinkingConfig(thinking_level='LOW'),
    ) if types else None
    last_error: Exception | None = None
    for model_name in dict.fromkeys([self.settings.gemini_model, *self.settings.gemini_fallback_models]):
      emitted = False
      try:
        stream = self.client.models.generate_content_stream(
          model=model_name, contents=prompt, config=config,
        )
        for chunk in stream:
          text = getattr(chunk, 'text', None)
          if text:
            emitted = True
            yield text
        if not emitted:
          raise RuntimeError(f'{model_name} returned an empty answer')
        return
      except Exception as error:  # pragma: no cover - network/runtime dependent
        if emitted:
          raise AIServiceError('The AI connection stopped while writing. Please retry your question.') from error
        last_error = error
        if is_gemini_quota_error(error):
          logger.warning('Gemini quota reached; streaming this response from Groq.')
          yield from self._stream_groq(prompt)
          return
        logger.warning('Gemini streaming model %s failed.', model_name, exc_info=True)

    if self.settings.groq_api_key:
      logger.warning('All Gemini models failed; streaming from Groq as the configured fallback.')
      try:
        yield from self._stream_groq(prompt)
        return
      except AIServiceError as groq_error:
        gemini_status = gemini_error_status(last_error)
        gemini_detail = f'Gemini failed with HTTP {gemini_status}' if gemini_status else 'Gemini could not answer'
        raise AIServiceError(
          f'{gemini_detail}; Groq fallback failed: {groq_error}'
        ) from groq_error

    gemini_status = gemini_error_status(last_error)
    if gemini_status in (401, 403):
      raise AIServiceError(
        f'Gemini rejected its API key (HTTP {gemini_status}). Replace AI_STUDY_GEMINI_API_KEY in backend/.env, or configure AI_STUDY_GROQ_API_KEY as fallback.'
      ) from last_error
    raise AIServiceError(
      'Gemini could not answer. Check the Gemini key, model access, and quota; configure AI_STUDY_GROQ_API_KEY in backend/.env for fallback.'
    ) from last_error


def normalize_markdown_answer(text: str) -> str:
  cleaned = text.strip()

  def unwrap_markdown_fence(match: re.Match[str]) -> str:
    language = (match.group('info') or '').strip().split(maxsplit=1)[0].lower()
    body = match.group('body')
    contains_markdown = re.search(r'^\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s)', body, re.MULTILINE)
    if language in {'markdown', 'md', 'text'} or (not language and contains_markdown):
      return body.strip()
    return match.group(0)

  cleaned = re.sub(
    r'(?P<fence>`{3,}|~{3,})(?P<info>[^\r\n]*)\r?\n(?P<body>[\s\S]*?)\r?\n(?P=fence)[ \t]*',
    unwrap_markdown_fence,
    cleaned,
  )
  normalized_lines: list[str] = []
  inside_code_fence = False
  for line in cleaned.splitlines():
    if re.match(r'^\s*(?:`{3,}|~{3,})', line):
      inside_code_fence = not inside_code_fence
      normalized_lines.append(line.lstrip())
    else:
      normalized_lines.append(line if inside_code_fence else line.lstrip())
  return '\n'.join(normalized_lines).strip()


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

# Dev reload: apply provider configuration updates.
