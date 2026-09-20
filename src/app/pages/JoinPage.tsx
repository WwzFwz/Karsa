/**
 * Entering a room. No account, no password, no email.
 *
 * A room is a code and a name you type. Anything more would be a login wall in
 * front of a tool whose whole point is that a class can open it on a laptop
 * with no internet at all.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/shared/icons'
import { useTheme } from '../../state/theme'
import { LangSwitch } from '../../components/shared/LangSwitch'
import { tr } from '../../core/i18n'

const SAMPLE_ROOM = 'KUR-482'

export function JoinPage({ onJoin }: { onJoin: (name: string) => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [code, setCode] = useState(SAMPLE_ROOM)
  const [error, setError] = useState<string | null>(null)
  const theme = useTheme()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError(
        tr(
          'Isi nama panggilan dulu supaya rekan tahu siapa yang menyunting.',
          'Type a display name first, so the others know who is editing.',
        ),
      )
      return
    }
    onJoin(name.trim())
    // A code goes straight to that room; without one, the dashboard is the
    // better landing -- it is where the rooms are.
    navigate(code.trim() ? `/ruang/${code.trim().toUpperCase()}` : '/ruang', { state: { via: 'kode' } })
  }

  return (
    <div className="join">
      <main className="join-card">
        <div className="join-brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="target" size={19} />
          </span>
          <div>
            <p className="brand-name">Karsa</p>
            <p className="brand-sub">{tr('Ruang kerja kolaboratif', 'A collaborative workspace')}</p>
          </div>
          <span className="topbar-spacer" />
          {/*
            The language switch belongs on this page too. It is the first thing
            anybody sees, and the two controls that decide how the whole product
            reads -- its language and its brightness -- should not be reachable
            only from inside a room somebody has not joined yet.
          */}
          <LangSwitch />
          <button
            type="button"
            className="icon-btn"
            aria-label={
              theme.active === 'dark'
                ? tr('Beralih ke tema terang', 'Switch to the light theme')
                : tr('Beralih ke tema gelap', 'Switch to the dark theme')
            }
            title={theme.active === 'dark' ? tr('Tema gelap', 'Dark theme') : tr('Tema terang', 'Light theme')}
            onClick={theme.toggle}
          >
            <Icon name={theme.active === 'dark' ? 'moon' : 'sun'} size={19} />
          </button>
        </div>

        <h1>{tr('Dioperasikan tanpa tangan. Diikuti tanpa mata.', 'Worked without hands. Followed without eyes.')}</h1>
        <p className="join-lede">
          {tr(
            'Satu model data, tiga tampilan setara: kanvas, outline, dan penelusuran lewat bunyi. Ketiganya berubah bersamaan karena ketiganya membaca data yang sama.',
            'One data model, three equal views: the canvas, the outline, and a walk through sound. All three change together because all three read the same data.',
          )}
        </p>

        <form onSubmit={submit} className="join-form">
          <div className="field">
            <label className="field-label" htmlFor="join-name">{tr('Nama panggilan', 'Display name')}</label>
            <input
              id="join-name"
              className="text-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder={tr('Nama yang muncul di daftar peserta', 'The name shown in the people list')}
              autoComplete="nickname"
              aria-describedby={error ? 'join-error' : 'join-name-help'}
              aria-invalid={Boolean(error)}
            />
            <p className="field-help" id="join-name-help">
              {tr('Tanpa akun, tanpa surel, tanpa kata sandi.', 'No account, no email, no password.')}
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="join-code">{tr('Kode ruang', 'Room code')}</label>
            <input
              id="join-code"
              className="text-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={`${tr('Contoh', 'For example')}: KUR-482`}
              aria-describedby="join-code-help"
            />
            <p className="field-help" id="join-code-help">
              {tr('Kosongkan untuk melihat daftar ruang. Ruang contoh', 'Leave it empty to see the room list. The sample room')}{' '}
              <strong>{SAMPLE_ROOM}</strong>{' '}
              {tr(
                'sudah berisi rapat kurikulum dengan lima peserta.',
                'already holds a curriculum meeting with five people.',
              )}
            </p>
          </div>

          {error && (
            <p className="form-error" id="join-error" role="alert">
              {error}
            </p>
          )}

          <div className="join-actions is-single">
            <button type="submit" className="btn btn-primary btn-wide">
              <Icon name="logIn" size={17} />
              {code.trim() ? tr('Gabung ke ruang', 'Join the room') : tr('Lihat daftar ruang', 'See the room list')}
            </button>
          </div>
        </form>

        <ul className="join-facts">
          <li>
            <Icon name="shield" size={16} />
            <span>
              <strong>{tr('Tidak ada audio yang keluar dari perangkat.', 'No audio leaves this device.')}</strong>{' '}
              {tr('Pengenalan suara dan model bahasa berjalan di sini.', 'Speech recognition and the language model run right here.')}
            </span>
          </li>
          <li>
            <Icon name="eye" size={16} />
            <span>
              <strong>{tr('Aksesibilitas aktif secara bawaan.', 'Accessibility is on by default.')}</strong>{' '}
              {tr('Tidak ada tombol mode aksesibel yang harus dinyalakan.', 'There is no accessible mode to switch on.')}
            </span>
          </li>
          <li>
            <Icon name="keyboard" size={16} />
            <span>
              <strong>{tr('Bisa dijalankan tanpa tetikus.', 'It works without a mouse.')}</strong>{' '}
              {tr('Tekan', 'Press')} <kbd>?</kbd>{' '}
              {tr('di dalam ruang untuk melihat seluruh pintasan.', 'inside a room to see every shortcut.')}
            </span>
          </li>
        </ul>
      </main>
    </div>
  )
}
