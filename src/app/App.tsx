import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AnnouncerProvider } from '../a11y/Announcer'
import { RoomProvider } from './RoomContext'
import { DialogProvider } from './DialogContext'
import { RoomShell } from './RoomShell'
import { JoinPage } from '../pages/JoinPage'
import { DashboardPage } from '../pages/DashboardPage'
import { WorkspacePage } from '../pages/WorkspacePage'
import { SummaryPage } from '../pages/SummaryPage'
import { SettingsPage } from '../pages/SettingsPage'

const NAME_KEY = 'karsa:nama'

export function App() {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')

  const join = (value: string) => {
    setName(value)
    localStorage.setItem(NAME_KEY, value)
  }

  return (
    <AnnouncerProvider>
      <Routes>
        <Route path="/" element={<JoinPage onJoin={join} />} />
        <Route
          path="/ruang"
          element={name ? <DashboardPage name={name} /> : <Navigate to="/" replace />}
        />
        <Route
          path="/ruang/:roomId/*"
          element={
            name ? (
              <RoomProvider selfName={name}>
                <DialogProvider>
                  <RoomShell>
                    <Routes>
                      {/* One workspace under several links, so each arrangement
                          keeps its own URL without becoming its own page. */}
                      <Route index element={<WorkspacePage />} />
                      <Route path="outline" element={<WorkspacePage />} />
                      <Route path="perintah" element={<WorkspacePage />} />
                      <Route path="peserta" element={<WorkspacePage />} />
                      <Route path="komentar" element={<WorkspacePage />} />
                      <Route path="ringkasan" element={<SummaryPage />} />
                      <Route path="pengaturan" element={<SettingsPage />} />
                    </Routes>
                  </RoomShell>
                </DialogProvider>
              </RoomProvider>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnnouncerProvider>
  )
}
