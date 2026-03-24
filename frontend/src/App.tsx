import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { AppLayout } from './layouts/AppLayout.tsx'
import { AuthPage } from './pages/AuthPage.tsx'
import { ChatPage } from './pages/ChatPage.tsx'
import { NotesPage } from './pages/NotesPage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/chats" replace />} />
          <Route path="chats" element={<ChatPage />} />
          <Route path="chats/:chatId" element={<ChatPage />} />
          <Route path="notes" element={<NotesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/chats" replace />} />
    </Routes>
  )
}

export default App
