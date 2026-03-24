# AI Study Assistant

Production-style scaffold for a full-stack AI study workspace built with:

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Firebase client auth
- Backend: FastAPI, Gemini integration, Firebase Admin support
- Data/Auth: Firestore collections + Firebase Authentication
- Deployment targets: Vercel or Netlify for the frontend, Render or Railway for the backend

## What is implemented

- Email/password and Google-ready auth flow on the frontend
- Protected app shell with a responsive sidebar, chat workspace, notes page, and settings modal
- Multiple chats per user with rename and delete actions
- Structured study answers rendered as markdown
- Save AI answers as notes, search notes, and delete notes
- Voice input via the Web Speech API when the browser supports it
- File import affordance for text-based study material
- PDF export for chats with lazy-loaded client-side PDF generation
- FastAPI endpoints for chat, messages, notes, preferences, and feedback
- Memory-backed local mode plus Firestore-ready repository wiring
- Gemini-ready AI service with an offline structured fallback when no API key is configured

## Project structure

```text
learn/
├─ frontend/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ contexts/
│  │  ├─ hooks/
│  │  ├─ layouts/
│  │  ├─ pages/
│  │  ├─ types/
│  │  └─ utils/
│  └─ .env.example
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ models/
│  │  ├─ repositories/
│  │  └─ services/
│  ├─ tests/
│  ├─ .env.example
│  ├─ requirements.txt
│  └─ requirements-dev.txt
└─ README.md
```

## Frontend setup

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Fill in Firebase web app values and the backend base URL.
3. Install and run:

```bash
cd frontend
npm install
npm run dev
```

If chat requests show `Failed to fetch` in local development:

- make sure the FastAPI backend is running on `http://127.0.0.1:8000`
- or use the included PowerShell helpers in [scripts/start-online-local.ps1](c:/Users/Public/Documents/learn/scripts/start-online-local.ps1) or [scripts/start-offline.ps1](c:/Users/Public/Documents/learn/scripts/start-offline.ps1)
- Vite now proxies `/api` to `http://127.0.0.1:8000` by default, so local frontend requests can work without cross-origin issues

You can also start everything from the repo root with:

```bash
npm run dev:online
```

or

```bash
npm run dev:offline
```

## Backend setup

1. Copy `backend/.env.example` to `backend/.env`.
2. For local demo mode, you can leave Firebase and Gemini keys empty.
3. Create a virtual environment, install dependencies, and run the API:

```bash
cd backend
py -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\uvicorn app.main:app --reload
```

The default local mode uses:

- `AI_STUDY_DATA_BACKEND=memory`
- `AI_STUDY_AUTH_MODE=auto`

That lets the frontend work in demo mode without cloud setup. For production, switch to:

- `AI_STUDY_DATA_BACKEND=firestore`
- real Firebase Admin credentials
- `AI_STUDY_GEMINI_API_KEY`

For local Firebase Admin setup on Windows, `AI_STUDY_FIREBASE_CREDENTIALS_PATH` can point to your downloaded service-account JSON, for example `C:/Users/<you>/Downloads/service-account.json`.

## Offline and online local hosting

Use the included PowerShell helpers from [scripts/start-offline.ps1](c:/Users/Public/Documents/learn/scripts/start-offline.ps1) and [scripts/start-online-local.ps1](c:/Users/Public/Documents/learn/scripts/start-online-local.ps1).

- Offline/demo mode:
  - backend runs with demo auth, memory storage, and offline AI fallback
  - frontend disables Firebase for that session and uses demo auth
- Connected/local mode:
  - backend uses `backend/.env`
  - frontend uses `frontend/.env`
  - Firebase and Firestore are used when configured

If you prefer manual env files instead of the scripts, use [frontend/.env.offline.example](c:/Users/Public/Documents/learn/frontend/.env.offline.example) and [backend/.env.offline.example](c:/Users/Public/Documents/learn/backend/.env.offline.example) as the offline/demo templates.

## Hosting options

### Offline / local hosting

- Use [scripts/start-offline.ps1](c:/Users/Public/Documents/learn/scripts/start-offline.ps1) for a fully local demo flow
- Or run `npm run dev:offline` from [package.json](c:/Users/Public/Documents/learn/package.json)

### Online / cloud hosting

- Frontend:
  - Vercel or Netlify
  - SPA rewrites are included in [frontend/vercel.json](c:/Users/Public/Documents/learn/frontend/vercel.json) and [frontend/public/_redirects](c:/Users/Public/Documents/learn/frontend/public/_redirects)
- Backend:
  - Render or Railway
  - A Render starter config is included in [render.yaml](c:/Users/Public/Documents/learn/render.yaml)

For online hosting, set your real Firebase and Gemini environment variables in the platform dashboard.

## Firestore model

- `users`: `uid`, `email`, `displayName`, `photoURL`, `createdAt`, `preferences`
- `chats`: `id`, `userId`, `title`, `createdAt`, `updatedAt`, `lastMessagePreview`
- `messages`: `id`, `chatId`, `userId`, `role`, `content`, `createdAt`, `feedback`
- `notes`: `id`, `userId`, `question`, `answer`, `sourceChatId`, `sourceMessageId`, `createdAt`

## API reference

Base URL: `/api`

- `GET /health`
- `GET /profile`
- `PATCH /preferences`
- `GET /chats`
- `GET /messages?chatId=<id>`
- `POST /ask`
- `GET /ask`
- `POST /save-note`
- `GET /notes`
- `DELETE /notes/{note_id}`
- `PATCH /chat/{chat_id}`
- `DELETE /chat/{chat_id}`
- `POST /messages/{message_id}/feedback`

### Example request

```json
POST /api/ask
{
  "chatId": null,
  "message": "Explain Newton's second law simply.",
  "regenerate": false,
  "preferences": {
    "theme": "dark",
    "language": "English",
    "answerLength": "balanced"
  }
}
```

### Example response

```json
{
  "chat": {
    "id": "chat_123",
    "userId": "uid_123",
    "title": "Explain Newton's second law simply.",
    "createdAt": "2026-03-24T12:00:00+00:00",
    "updatedAt": "2026-03-24T12:00:02+00:00",
    "lastMessagePreview": "### Explanation ..."
  },
  "assistantMessage": {
    "id": "msg_ai_123",
    "chatId": "chat_123",
    "userId": "uid_123",
    "role": "assistant",
    "content": "### Explanation\n...",
    "createdAt": "2026-03-24T12:00:02+00:00",
    "feedback": null
  },
  "messages": []
}
```

## Testing

Backend smoke and unit-style checks are included in `backend/tests/test_api.py`.

```bash
cd backend
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\pytest
```

## Deployment notes

- Frontend: set Vercel or Netlify env vars for Firebase client config and `VITE_API_BASE_URL`
- Backend: set Render or Railway env vars for Gemini and Firebase Admin
- Firebase: configure Authentication providers and Firestore security rules for user isolation
- CORS: update `AI_STUDY_CORS_ORIGINS` with your deployed frontend URL

## Validation completed here

- `frontend`: `npm.cmd run build`
- `backend`: `python -m compileall app`
- `backend`: FastAPI import check
- `backend`: demo-mode API smoke test covering ask, chats, messages, notes, and delete chat
