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

## Run locally in two terminals (Windows PowerShell)

Open two PowerShell terminals at the project root (`Project\learn`). Start the frontend in Terminal 1:

```powershell
Set-Location .\frontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Start the API in Terminal 2:

```powershell
Set-Location .\backend
# Run this once if the .venv folder does not exist yet:
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Keep both terminals open. Visit `http://127.0.0.1:5173`; the frontend forwards `/api` requests to the backend on port `8000`. Use `Ctrl+C` in each terminal to stop its service. If port `8000` is already occupied, stop the old backend before starting another one. The root command `npm.cmd run dev` starts the connected/local setup in two new PowerShell windows; `npm.cmd run dev:offline` starts the demo setup.

## Frontend setup

1. Copy `frontend/.env.example` to `frontend/.env`.
2. Keep the Firebase project values set to your Firebase Web app, and make sure `VITE_API_BASE_URL=/api` and `VITE_API_PROXY_TARGET=http://127.0.0.1:8000` for local development.
3. Install frontend dependencies in the `frontend` folder, then run the frontend in Terminal 1 as shown above.

```powershell
Set-Location .\frontend
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

If chat requests show `Failed to fetch` in local development:

- make sure the FastAPI backend is running on `http://127.0.0.1:8000`
- or use the included PowerShell helpers in [scripts/start-online-local.ps1](scripts/start-online-local.ps1) or [scripts/start-offline.ps1](scripts/start-offline.ps1)
- Vite now proxies `/api` to `http://127.0.0.1:8000` by default, so local frontend requests can work without cross-origin issues

You can also start both services from the repo root in separate PowerShell windows with:

```powershell
npm.cmd run dev
```

This is an alias for `npm.cmd run dev:online`. For demo mode, use `npm.cmd run dev:offline`.

## Backend setup

1. Copy `backend/.env.example` to `backend/.env` for connected mode, then set `AI_STUDY_GEMINI_API_KEY`, `AI_STUDY_GROQ_API_KEY`, and the Firebase Admin credential path. Keep `AI_STUDY_FIREBASE_PROJECT_ID` the same as the frontend Firebase project.

Gemini is tried first (`gemini-3.5-flash-lite`, with Gemini 3.6 Flash and 3.8 Flash fallbacks). If Gemini fails, the backend tries Groq (`openai/gpt-oss-20b`). If neither provider accepts the request, the chat shows a provider-specific error. After changing API keys or models, restart the backend terminal so it reloads `backend/.env`.
2. For offline/demo mode instead, copy `backend/.env.offline.example` and use `frontend/.env.offline.example`; the offline launcher also applies these settings for its session.
3. Create the backend virtual environment, install dependencies, and run the API in Terminal 2 as shown above.

```powershell
Set-Location .\backend
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The connected local setup uses the values in `backend/.env` (Firestore and Firebase Auth when configured). The offline launcher uses demo auth and in-memory storage. For production, configure:

- `AI_STUDY_DATA_BACKEND=firestore`
- real Firebase Admin credentials
- `AI_STUDY_GEMINI_API_KEY`

For local Firebase Admin setup on Windows, `AI_STUDY_FIREBASE_CREDENTIALS_PATH` can point to your downloaded service-account JSON, for example `C:/Users/<you>/Downloads/service-account.json`.

## Offline and online local hosting

Use the included PowerShell helpers from [scripts/start-offline.ps1](scripts/start-offline.ps1) and [scripts/start-online-local.ps1](scripts/start-online-local.ps1).

- Offline/demo mode:
  - backend runs with demo auth, memory storage, and offline AI fallback
  - frontend disables Firebase for that session and uses demo auth
- Connected/local mode:
  - backend uses `backend/.env`
  - frontend uses `frontend/.env`
  - Firebase and Firestore are used when configured

If you prefer manual env files instead of the scripts, use [frontend/.env.offline.example](frontend/.env.offline.example) and [backend/.env.offline.example](backend/.env.offline.example) as the offline/demo templates.

## Hosting options

### Offline / local hosting

- Use [scripts/start-offline.ps1](scripts/start-offline.ps1) for a fully local demo flow
- Or run `npm.cmd run dev:offline` from [package.json](package.json)

### Online / cloud hosting

- Frontend:
  - Vercel or Netlify
  - SPA rewrites are included in [frontend/vercel.json](frontend/vercel.json) and [frontend/public/_redirects](frontend/public/_redirects)
- Backend:
  - Render or Railway
  - A Render starter config is included in [render.yaml](render.yaml)

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
