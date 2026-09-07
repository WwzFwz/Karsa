import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { JoinPage } from '../pages/JoinPage'

const NAME_KEY = 'kanvas-setara:nama'

export function App() {
  const [, setName] = useState(() => localStorage.getItem(NAME_KEY) ?? '')

  const join = (value: string) => {
    setName(value)
    localStorage.setItem(NAME_KEY, value)
  }

  return (
    <Routes>
      <Route path="/" element={<JoinPage onJoin={join} />} />
      {/* The room itself arrives in a later commit. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
