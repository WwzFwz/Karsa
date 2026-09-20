import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AnnouncerProvider } from '../a11y/Announcer'
import { RoomGate } from './RoomGate'
import { DialogProvider } from '../state/dialogs/DialogProvider'
import { RoomShell } from '../components/layout/RoomShell'
import { DialogHost } from '../components/dialogs/DialogHost'
import { JoinPage } from './pages/JoinPage'
import { DashboardPage } from './pages/DashboardPage'
import { WorkspacePage } from './pages/WorkspacePage'
import { SummaryPage } from './pages/SummaryPage'
import { SettingsPage } from './pages/SettingsPage'
import { useLang } from '../state/useLang'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'

const NAME_KEY = 'karsa:nama'

export function App() {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')
  /*
    One subscription for the whole tree.

    `tr` reads the current language at call time, so a component only shows the
    new language when something re-renders it -- and with `tr` now in three
    dozen files, a per-component hook would mean three dozen chances to forget
    one and leave a stray Indonesian label behind after the switch. Subscribing
    here re-renders everything below, which is correct as long as nothing in
    between is memoised; nothing is, and a `memo` added later would show up as
    exactly that stray label.
  */
  useLang()

  const join = (value: string) => {
    setName(value)
    localStorage.setItem(NAME_KEY, value)
  }

  return (
    <AnnouncerProvider>
      {/*
        The outermost net.

        Anything that gets past the boundary inside the room -- a crash in the
        join page, in the dashboard, or in a provider above the shell -- lands
        here instead of on a blank page. A blank page is the one failure this
        product cannot explain, because nothing is left to read or announce.
      */}
      <ErrorBoundary scope="app">
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
                <RoomGate name={name}>
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
                    <DialogHost />
                  </DialogProvider>
                </RoomGate>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </AnnouncerProvider>
  )
}
