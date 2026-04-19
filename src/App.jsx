import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'

import Login from './pages/Login'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Tasks from './pages/Tasks'
import Docs from './pages/Docs'
import Forms from './pages/Forms'
import Schedule from './pages/Schedule'
import Team from './pages/Team'
import Assistant from './pages/Assistant'

import AdminDocuments from './pages/admin/Documents'
import AdminSchedule from './pages/admin/Schedule'
import AdminTeam from './pages/admin/Team'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/team" element={<Team />} />
          <Route path="/assistant" element={<Assistant />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/schedule" element={<AdminSchedule />} />
            <Route path="/admin/team" element={<AdminTeam />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
