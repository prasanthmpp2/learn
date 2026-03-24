import re
from textwrap import dedent

from app.models.schemas import HistoryItem, Preferences


SYSTEM_PROMPT = dedent(
  """
  You are AI Study Assistant, a structured and student-friendly study tutor.
  Keep answers markdown-friendly, note-friendly, and easy to review later.

  Default answer format for study questions:
  ### Explanation
  Clear, beginner-friendly explanation.

  ### Key Points
  4-10 concise bullets with facts, formulas, steps, or ideas.

  ### Summary
  2-4 sentences that are useful for quick revision.

  Respect the current chat preferences for tone, length, and language.
  Use previous chat history when it helps resolve follow-up questions.
  Refuse unsafe requests or active exam cheating help, and offer a safe study alternative.
  """
).strip()


OFFLINE_TOPIC_GUIDES = {
  'machine learning': {
    'aliases': ['ml'],
    'name': 'Machine Learning (ML)',
    'explanation': (
      'Machine Learning (ML) is a branch of artificial intelligence in which '
      'computers learn patterns from data and use those patterns to make predictions '
      'or decisions. Instead of writing every rule by hand, we train a model with '
      'examples so it can improve its performance on similar tasks.'
    ),
    'detail': (
      'A simple ML workflow is: collect data, clean it, choose a model, train it, '
      'test it, and then improve it based on errors.'
    ),
    'key_points': [
      'ML helps systems learn from data instead of following only fixed rules.',
      'Training data is used to teach the model what patterns to look for.',
      'The model should be tested on new data, not only on the training data.',
      'Common tasks include classification, prediction, recommendation, and pattern detection.',
      'Examples of ML use cases include spam filtering, face recognition, and product recommendations.',
      'Good data quality strongly affects how accurate an ML system becomes.',
      'Overfitting happens when a model memorizes training data but performs poorly on new data.',
      'ML is a subset of AI, while deep learning is a subset of ML.',
    ],
    'summary': (
      'ML means teaching a computer to learn from data. It is used when we want a system '
      'to find patterns, make predictions, or improve over time without manually coding every rule.'
    ),
  },
  'artificial intelligence': {
    'aliases': ['ai'],
    'name': 'Artificial Intelligence (AI)',
    'explanation': (
      'Artificial Intelligence (AI) is the field of building systems that can perform '
      'tasks that normally require human intelligence, such as understanding language, '
      'recognizing images, solving problems, or making decisions.'
    ),
    'detail': (
      'AI is a broad area that includes machine learning, rule-based systems, search, '
      'planning, robotics, and natural language processing.'
    ),
    'key_points': [
      'AI is the larger field of making machines act intelligently.',
      'Machine learning is one important approach inside AI.',
      'AI systems can work with language, images, audio, and structured data.',
      'Examples include chatbots, recommendation systems, virtual assistants, and self-driving support.',
      'Some AI systems use rules, while others learn from examples.',
      'AI is used to automate tasks, improve decisions, and analyze large amounts of data.',
      'The quality of an AI system depends on data, design, and evaluation.',
      'AI should be used responsibly because poor design can create bias or unsafe outcomes.',
    ],
    'summary': (
      'AI is the broad idea of making computers perform intelligent tasks. ML is one part of AI, '
      'and many modern AI tools learn from data rather than relying only on fixed rules.'
    ),
  },
  'deep learning': {
    'aliases': ['dl'],
    'name': 'Deep Learning (DL)',
    'explanation': (
      'Deep Learning is a type of machine learning that uses neural networks with many layers '
      'to learn complex patterns from data. It is especially useful for tasks like image recognition, '
      'speech processing, and language understanding.'
    ),
    'detail': (
      'Deep learning usually needs larger datasets and more computing power than simpler machine learning methods.'
    ),
    'key_points': [
      'Deep learning is a subset of machine learning.',
      'It uses multilayer neural networks to learn features automatically.',
      'It is powerful for images, audio, video, and text.',
      'Large datasets often help deep learning models perform better.',
      'Training can be computationally expensive and may need GPUs.',
      'Examples include face detection, speech recognition, and modern language models.',
      'Feature extraction is often learned automatically instead of engineered manually.',
      'Model size, training data, and tuning strongly affect performance.',
    ],
    'summary': (
      'Deep learning is a more advanced form of ML that uses layered neural networks. '
      'It is very strong for complex pattern recognition tasks, especially when a lot of data is available.'
    ),
  },
  'neural network': {
    'aliases': ['neural networks', 'ann'],
    'name': 'Neural Network',
    'explanation': (
      'A neural network is a model inspired by how the brain processes signals. '
      'It consists of layers of connected nodes that transform input data step by step '
      'until the model produces an output such as a label, number, or probability.'
    ),
    'detail': (
      'Each connection has a weight, and training adjusts those weights so the model can reduce error.'
    ),
    'key_points': [
      'A neural network has input, hidden, and output layers.',
      'Each node receives values, applies weights, and passes the result forward.',
      'Activation functions help the model learn non-linear patterns.',
      'Training adjusts weights to reduce the difference between prediction and reality.',
      'Neural networks are used in deep learning systems.',
      'They work well for image, speech, and text problems.',
      'Large networks can learn powerful patterns but may need more data and compute.',
      'Poorly trained networks can overfit or generalize badly.',
    ],
    'summary': (
      'A neural network is a layered model that learns patterns by adjusting connection weights. '
      'It is one of the main building blocks of deep learning.'
    ),
  },
  'algorithm': {
    'aliases': ['algorithms'],
    'name': 'Algorithm',
    'explanation': (
      'An algorithm is a clear, ordered set of steps used to solve a problem or complete a task. '
      'In computing, algorithms tell a computer exactly how to process input and produce output.'
    ),
    'detail': 'Good algorithms aim to be correct, efficient, and easy to understand.',
    'key_points': [
      'An algorithm is step-by-step logic for solving a problem.',
      'It should have a clear input, process, and output.',
      'Algorithms can be written in plain language, flowcharts, or code.',
      'Efficiency matters because some algorithms use less time or memory than others.',
      'Sorting and searching are common examples of algorithmic problems.',
      'A program can contain many algorithms working together.',
      'Correctness is as important as speed.',
      'A simple algorithm is often easier to test and maintain.',
    ],
    'summary': (
      'An algorithm is a step-by-step procedure for solving a problem. '
      'Programming uses algorithms to turn logic into working software.'
    ),
  },
  'api': {
    'aliases': ['apis'],
    'name': 'API',
    'explanation': (
      'API stands for Application Programming Interface. It is a structured way for one software system '
      'to request data or actions from another software system.'
    ),
    'detail': (
      'For example, a frontend app can call a backend API to send a question, fetch chats, or save notes.'
    ),
    'key_points': [
      'An API defines how systems talk to each other.',
      'It usually describes available endpoints, inputs, and outputs.',
      'APIs help frontend and backend services stay separated but connected.',
      'HTTP APIs often use methods like GET, POST, PATCH, and DELETE.',
      'JSON is a common format for API requests and responses.',
      'Authentication and validation are important parts of API design.',
      'Good APIs are predictable, documented, and secure.',
      'In this project, the frontend calls FastAPI endpoints through an API layer.',
    ],
    'summary': (
      'An API is a communication contract between software systems. '
      'It lets one part of an application request data or actions from another part in a clear format.'
    ),
  },
}


TOPIC_ALIASES = {
  alias: topic
  for topic, guide in OFFLINE_TOPIC_GUIDES.items()
  for alias in [topic, *guide['aliases']]
}

QUESTION_PREFIXES = [
  'what do you mean by ',
  'what is meant by ',
  'what is mean by ',
  'what is the meaning of ',
  'what is ',
  'meaning of ',
  'mean by ',
  'define ',
  'explain ',
  'tell me about ',
]


def build_contextual_prompt(
  question: str,
  history: list[HistoryItem],
  preferences: Preferences,
  *,
  note_context: list[str] | None = None,
  adaptation_instruction: str | None = None,
) -> str:
  recent_history = '\n'.join(
    f"- {item.role}: {item.content}" for item in history[-10:]
  )

  history_block = recent_history or '- No earlier messages in this chat.'
  notes_block = '\n'.join(f"- {note}" for note in (note_context or []))
  note_context_block = notes_block or '- No relevant saved notes for this question.'
  answering_rules = '\n'.join(
    f"- {rule}" for rule in build_answering_rules(question)
  )
  adaptation_block = adaptation_instruction or 'Use the default direct study-assistant style.'

  return dedent(
    f"""
    {SYSTEM_PROMPT}

    Additional answering rules:
    {answering_rules}

    Current preferences:
    - Theme: {preferences.theme}
    - Language: {preferences.language}
    - Answer length: {preferences.answer_length}

    Recent chat history:
    {history_block}

    Relevant saved notes:
    {note_context_block}

    Adaptive style memory:
    - {adaptation_block}

    New student message:
    {question}
    """
  ).strip()


def build_offline_response(
  question: str,
  preferences: Preferences,
  history: list[HistoryItem],
  *,
  note_context: list[str] | None = None,
  adaptation_instruction: str | None = None,
) -> str:
  lower_question = question.lower()
  unsafe_phrases = [
    'cheat on my exam',
    'exam answers',
    'bypass proctor',
    'hack the test',
    'answer the live test',
  ]

  if any(phrase in lower_question for phrase in unsafe_phrases):
    return dedent(
      """
      ### Explanation
      I can help you learn the material, but I cannot help with cheating or bypassing an active exam.

      ### Key Points
      - I can explain the topic step by step.
      - I can turn the topic into revision notes.
      - I can generate practice questions similar to the concept.
      - I can help you build a quick study plan before the assessment.

      ### Summary
      I cannot help with cheating, but I can absolutely help you prepare and understand the material well enough to answer confidently yourself.
      """
    ).strip()

  guide, topic = resolve_offline_guide(question)
  bullet_count = {
    'brief': 4,
    'balanced': 6,
    'deep': 8,
  }[preferences.answer_length]

  if guide:
    explanation = shape_explanation(guide['explanation'], guide.get('detail'), preferences)
    note_bridge = build_note_bridge(note_context)
    if note_bridge:
      explanation = f'{explanation} {note_bridge}'
    key_points = '\n'.join(f"- {point}" for point in guide['key_points'][:bullet_count])
    return dedent(
      f"""
      ### Explanation
      {explanation}

      ### Key Points
      {key_points}

      ### Summary
      {guide['summary']}
      """
    ).strip()

  return build_generic_response(
    topic or question,
    history,
    bullet_count,
    note_context=note_context,
    adaptation_instruction=adaptation_instruction,
  )


def resolve_offline_guide(question: str) -> tuple[dict | None, str]:
  topic = extract_topic(question)
  if not topic:
    return None, ''

  if topic in TOPIC_ALIASES:
    resolved_topic = TOPIC_ALIASES[topic]
    return OFFLINE_TOPIC_GUIDES[resolved_topic], resolved_topic

  compact_topic = topic.replace('.', '').strip()
  if compact_topic in TOPIC_ALIASES:
    resolved_topic = TOPIC_ALIASES[compact_topic]
    return OFFLINE_TOPIC_GUIDES[resolved_topic], resolved_topic

  return None, topic


def extract_topic(question: str) -> str:
  normalized = normalize_text(question)
  for prefix in QUESTION_PREFIXES:
    if normalized.startswith(prefix):
      normalized = normalized.removeprefix(prefix).strip()
      break

  normalized = re.sub(r'^(the|a|an)\s+', '', normalized)
  return normalized.strip(' .?!')


def normalize_text(value: str) -> str:
  normalized = re.sub(r'[^a-z0-9+\-./\s]', ' ', value.lower())
  normalized = re.sub(r'\s+', ' ', normalized)
  return normalized.strip()


def shape_explanation(
  explanation: str,
  detail: str | None,
  preferences: Preferences,
) -> str:
  sentences = split_sentences(explanation)
  if preferences.answer_length == 'brief':
    return ' '.join(sentences[:2])

  if preferences.answer_length == 'deep' and detail:
    return f"{' '.join(sentences)} {detail}"

  return ' '.join(sentences)


def split_sentences(text: str) -> list[str]:
  return [sentence.strip() for sentence in re.split(r'(?<=[.!?])\s+', text) if sentence.strip()]


def display_topic(topic: str) -> str:
  compact = topic.replace('.', '').strip()
  if compact.isalpha() and len(compact) <= 4:
    return compact.upper()
  return topic.title()


def build_generic_response(
  topic: str,
  history: list[HistoryItem],
  bullet_count: int,
  *,
  note_context: list[str] | None = None,
  adaptation_instruction: str | None = None,
) -> str:
  title = display_topic(topic)
  explanation = (
    f"{title} is the main topic in your question. A strong study answer should first define it in one line, "
    f"then show why it matters, and finally give a small example or use case so the idea becomes easy to remember."
  )
  if history:
    explanation += ' If this is a follow-up to an earlier topic, connect it to the previous concept before memorizing details.'
  note_bridge = build_note_bridge(note_context)
  if note_bridge:
    explanation += f' {note_bridge}'

  generic_points = [
    f"Start with a one-sentence definition of {title}.",
    f"Identify where {title} is used in practice or in your syllabus.",
    f"Note the most important terms, formulas, or parts connected to {title}.",
    f"Add one simple example so {title} becomes easier to remember.",
    f"Compare {title} with a related concept if confusion is likely.",
    f"Revise {title} using short notes instead of long paragraphs.",
    f"Practice one question on {title} to check understanding.",
    'Focus on meaning first, then memorize technical wording.',
  ]
  key_points = '\n'.join(f"- {point}" for point in generic_points[:bullet_count])

  summary = (
    f"The best way to learn {title} is to understand the definition, the purpose, and one clear example. "
    f"If you want, ask the next question in a more specific form such as '{title}: definition, uses, and example'."
  )
  if adaptation_instruction and 'direct' in adaptation_instruction.lower():
    summary += ' I will keep future answers more direct and specific.'

  return dedent(
    f"""
    ### Explanation
    {explanation}

    ### Key Points
    {key_points}

    ### Summary
    {summary}
    """
  ).strip()


def build_answering_rules(question: str) -> list[str]:
  rules = [
    'Answer the exact question directly in the first 1-2 sentences.',
    'Avoid generic filler, vague study advice, or meta commentary unless the user asked for it.',
    'Keep the explanation tightly related to the user question instead of drifting to broad theory.',
    'Use examples only when they make the answer clearer.',
  ]

  if looks_like_definition_question(question):
    rules.append('If the question is asking for a meaning or definition, start with "X means..." and expand any abbreviation.')

  return rules


def looks_like_definition_question(question: str) -> bool:
  normalized = normalize_text(question)
  definition_phrases = [
    'what is',
    'mean by',
    'meaning of',
    'define',
    'explain',
  ]
  return any(phrase in normalized for phrase in definition_phrases) or len(normalized.split()) <= 4


def build_note_bridge(note_context: list[str] | None) -> str:
  if not note_context:
    return ''

  return f"Relevant note from this workspace: {note_context[0]}."
