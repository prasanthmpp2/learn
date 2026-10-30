# AI Study Assistant

Full-stack AI study workspace with a React/Vite frontend, FastAPI backend, Firebase Auth and Firestore, Gemini-first AI, and a local offline demo mode.

- Frontend: React, Vite, Tailwind CSS, Framer Motion, Firebase client auth
- Backend: FastAPI, Gemini integration, Firebase Admin support
- Data/Auth: Firestore collections + Firebase Authentication
- Hosting: one Render service for the frontend and API, plus a no-cloud offline demo on your computer

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
2. Gemini is tried first (`gemini-3.5-flash-lite`, with Gemini 3.6 Flash and 3.8 Flash fallbacks). If Gemini fails, the backend tries Groq (`openai/gpt-oss-20b`). After changing API keys or models, restart the backend so it reloads `backend/.env`.
3. For offline/demo mode, the launcher uses demo auth, memory storage, and no Gemini or Groq keys.
4. Create the backend virtual environment, install dependencies, and run the API in Terminal 2 as shown above.

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

## Offline mode on your computer

Run `npm.cmd run dev:offline` from the project root. It opens the frontend and backend in separate PowerShell windows and uses demo sign-in, in-memory storage, and the local offline answer fallback. It does not need Firebase, Gemini, or Groq credentials and does not call those cloud services. Data in memory is cleared when the backend stops. Open `http://127.0.0.1:5173` on the same computer; both local services must stay running.

For connected local development instead, create `frontend/.env` and `backend/.env` from their `.env.example` files, fill in the Firebase and AI settings, then run `npm.cmd run dev`. This uses the cloud Firebase and AI services while the app itself runs locally.

## Online hosting: one Render service for frontend and backend

The root [render.yaml](render.yaml) and [Dockerfile](Dockerfile) deploy the React/Vite frontend and FastAPI backend together as one Render web service with one URL. Render builds the frontend, then FastAPI serves its static files and API routes. [Netlify](netlify.toml) can host the frontend by itself, but the existing Python API still needs a separate backend host when using Netlify.

1. Push the project to GitHub.
2. In Render, choose **New + → Blueprint**, connect this GitHub repository, and select the root `render.yaml`.
3. When prompted, set `VITE_FIREBASE_API_KEY` from the Firebase Web app config. `render.yaml` already contains the other Firebase Web config values for project `ai-study-assistant-26`; change them if your Firebase app differs.
4. Set `AI_STUDY_FIREBASE_CLIENT_EMAIL` and `AI_STUDY_FIREBASE_PRIVATE_KEY` from the Firebase Admin service-account key. Enter the entire private key; escaped `\\n` values are normalized by the backend.
5. Set `AI_STUDY_GEMINI_API_KEY`. Add `AI_STUDY_GROQ_API_KEY` if you want Groq fallback. Keep these secrets only in Render; never commit them.
6. Create the Blueprint and wait for the image build and deploy. Open the generated `https://...onrender.com` URL. The health endpoint is `/api/health`.
7. In Firebase Console, add the generated `...onrender.com` hostname under **Authentication → Settings → Authorized domains** so sign-in works on the deployed app.

The Firebase Web config is embedded into frontend assets during the build. If those values change, trigger a rebuild. Gemini, Groq, and Firebase Admin credentials are runtime secrets. The free Render service can sleep when inactive, so the first visit after a quiet period may take longer.

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

- Frontend and API: deploy together from the root `render.yaml` Blueprint and `Dockerfile`
- Firebase: authorize the generated Render domain and enable the required Authentication providers
- Secrets: keep AI provider keys and Firebase Admin credentials in Render environment settings

## Validation completed here

- `frontend`: `npm.cmd run build`
- `backend`: `python -m compileall app`
- `backend`: FastAPI import check
- `backend`: demo-mode API smoke test covering ask, chats, messages, notes, and delete chat
