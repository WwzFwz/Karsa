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
      setError('Isi nama panggilan dulu supaya rekan tahu siapa yang menyunting.')
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
            <p className="brand-sub">Ruang kerja kolaboratif</p>
          </div>
          <span className="topbar-spacer" />
          <button
            type="button"
            className="icon-btn"
            aria-label={theme.active === 'dark' ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
            title={theme.active === 'dark' ? 'Tema gelap' : 'Tema terang'}
            onClick={theme.toggle}
          >
            <Icon name={theme.active === 'dark' ? 'moon' : 'sun'} size={19} />
          </button>
        </div>

        <h1>Dioperasikan tanpa tangan. Diikuti tanpa mata.</h1>
        <p className="join-lede">
          Satu model data, tiga tampilan setara: kanvas, outline, dan penelusuran lewat bunyi.
          Ketiganya berubah bersamaan karena ketiganya membaca data yang sama.
        </p>

        <form onSubmit={submit} className="join-form">
          <div className="field">
            <label className="field-label" htmlFor="join-name">
              Nama panggilan
            </label>
            <input
              id="join-name"
              className="text-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Nama yang muncul di daftar peserta"
              autoComplete="nickname"
              aria-describedby={error ? 'join-error' : 'join-name-help'}
              aria-invalid={Boolean(error)}
            />
            <p className="field-help" id="join-name-help">
              Tanpa akun, tanpa surel, tanpa kata sandi.
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="join-code">
              Kode ruang
            </label>
            <input
              id="join-code"
              className="text-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: KUR-482"
              aria-describedby="join-code-help"
            />
            <p className="field-help" id="join-code-help">
              Kosongkan untuk melihat daftar ruang. Ruang contoh <strong>{SAMPLE_ROOM}</strong> sudah
              berisi rapat kurikulum dengan lima peserta.
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
              {code.trim() ? 'Gabung ke ruang' : 'Lihat daftar ruang'}
            </button>
          </div>
        </form>

        <ul className="join-facts">
          <li>
            <Icon name="shield" size={16} />
            <span>
              <strong>Tidak ada audio yang keluar dari perangkat.</strong> Pengenalan suara dan model
              bahasa berjalan di sini.
            </span>
          </li>
          <li>
            <Icon name="eye" size={16} />
            <span>
              <strong>Aksesibilitas aktif secara bawaan.</strong> Tidak ada tombol mode aksesibel
              yang harus dinyalakan.
            </span>
          </li>
          <li>
            <Icon name="keyboard" size={16} />
            <span>
              <strong>Bisa dijalankan tanpa tetikus.</strong> Tekan <kbd>?</kbd> di dalam ruang untuk
              melihat seluruh pintasan.
            </span>
          </li>
        </ul>
      </main>
    </div>
  )
}
