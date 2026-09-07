/**
 * Settings.
 *
 * The provider list shows options that are not built yet, disabled rather than
 * hidden. Hiding them would teach the wrong shape of the product: a person
 * should be able to see that a cloud option exists, what it would cost them in
 * privacy, and that it is off. The line that matters on each row is not the
 * model name -- it is where the words go.
 */

import { useRoom } from '../app/RoomContext'
import { useTheme, type ThemeChoice } from '../ui/theme'
import { ACTIVE_PROVIDER, PROVIDERS } from '../features/ai/providers'
import { MODE_HINT, MODE_LABEL } from '../ui/labels'
import { Icon } from '../ui/icons'
import type { SoundProfile } from '../audio/earcons'

const SOUND_LABEL: Record<SoundProfile, { name: string; hint: string }> = {
  silent: { name: 'Diam', hint: 'Tidak ada bunyi peristiwa sama sekali.' },
  sparse: { name: 'Hemat', hint: 'Hanya peristiwa penting. Bawaan mode rapat.' },
  full: { name: 'Penuh', hint: 'Termasuk perpindahan fokus. Bawaan mode telaah.' },
}

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Ikut sistem',
  light: 'Terang',
  dark: 'Gelap',
}

export function SettingsPage() {
  const { mode, setMode, soundProfile, setSoundProfile } = useRoom()
  const theme = useTheme()

  return (
    <div className="page page-settings">
      <section className="settings-main">
        <header className="summary-head">
          <h1>Pengaturan</h1>
          <p>Berlaku untuk perangkat ini saja. Tidak ada yang dikirim ke peserta lain.</p>
        </header>

        <section className="panel" aria-labelledby="provider-heading">
          <header className="panel-head">
            <h2 id="provider-heading">
              <Icon name="sparkles" size={15} />
              Penyedia model
            </h2>
            <span className="pill pill-ok">
              <Icon name="shield" size={12} />
              Lokal
            </span>
          </header>
          <p className="panel-note">
            Satu antarmuka, beberapa penyedia. Yang lain belum dibangun dan sengaja tetap
            ditampilkan supaya jelas apa yang berubah kalau salah satunya dinyalakan.
          </p>

          <ul className="provider-list">
            {PROVIDERS.map((p) => {
              const active = p.id === ACTIVE_PROVIDER
              return (
                <li key={p.id}>
                  <label className={`provider ${active ? 'is-on' : 'is-off'}`}>
                    <input
                      type="radio"
                      name="provider"
                      checked={active}
                      disabled={p.status !== 'active'}
                      readOnly
                    />
                    <span className="provider-body">
                      <span className="provider-name">
                        {p.name}
                        {active ? (
                          <span className="pill pill-ok">aktif</span>
                        ) : (
                          <span className="pill">
                            <Icon name="lock" size={11} />
                            fase lanjut
                          </span>
                        )}
                      </span>
                      <span className="provider-detail">{p.detail}</span>
                      <span
                        className={`provider-path ${
                          p.dataPath.startsWith('Tidak') ? '' : 'is-warn'
                        }`}
                      >
                        <Icon name={p.id === 'cloud' || p.id === 'vllm' ? 'alert' : 'shield'} size={12} />
                        {p.dataPath}
                      </span>
                      {p.warning && <span className="provider-warning">{p.warning}</span>}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <p className="panel-note" style={{ marginTop: 12, marginBottom: 0 }}>
            Audio tidak pernah dikirim ke penyedia mana pun, termasuk yang di awan. Yang berpindah
            paling jauh hanyalah teks dan struktur outline.
          </p>
        </section>

        <section className="panel" aria-labelledby="mode-heading">
          <header className="panel-head">
            <h2 id="mode-heading">
              <Icon name="presentation" size={15} />
              Mode sesi
            </h2>
          </header>
          <div className="option-row">
            {(['meeting', 'review'] as const).map((m) => (
              <label key={m} className={`option ${mode === m ? 'is-on' : ''}`}>
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                <span>
                  <strong>{MODE_LABEL[m]}</strong>
                  <span className="option-hint">{MODE_HINT[m]}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="sound-heading">
          <header className="panel-head">
            <h2 id="sound-heading">
              <Icon name="volume" size={15} />
              Profil bunyi
            </h2>
          </header>
          <p className="panel-note">
            Setiap fitur tetap memancarkan peristiwa ke audio bus. Profil ini yang menentukan mana
            yang terdengar, jadi diam secara bawaan bukan berarti ada fitur yang bisu.
          </p>
          <div className="option-row">
            {(['silent', 'sparse', 'full'] as const).map((p) => (
              <label key={p} className={`option ${soundProfile === p ? 'is-on' : ''}`}>
                <input
                  type="radio"
                  name="sound"
                  checked={soundProfile === p}
                  onChange={() => setSoundProfile(p)}
                />
                <span>
                  <strong>{SOUND_LABEL[p].name}</strong>
                  <span className="option-hint">{SOUND_LABEL[p].hint}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="theme-heading">
          <header className="panel-head">
            <h2 id="theme-heading">
              <Icon name={theme.active === 'dark' ? 'moon' : 'sun'} size={15} />
              Tampilan
            </h2>
          </header>
          <div className="option-row">
            {(['system', 'light', 'dark'] as const).map((choice) => (
              <label key={choice} className={`option ${theme.choice === choice ? 'is-on' : ''}`}>
                <input
                  type="radio"
                  name="theme"
                  checked={theme.choice === choice}
                  onChange={() => theme.setChoice(choice)}
                />
                <span>
                  <strong>{THEME_LABEL[choice]}</strong>
                </span>
              </label>
            ))}
          </div>
        </section>
      </section>

      <aside className="side-column" aria-label="Catatan">
        <section className="panel" aria-labelledby="promise-heading">
          <header className="panel-head">
            <h2 id="promise-heading">
              <Icon name="shield" size={15} />
              Yang melintasi jaringan
            </h2>
          </header>
          <ul className="loose-list">
            <li>
              <Icon name="check" size={14} />
              Perubahan dokumen
            </li>
            <li>
              <Icon name="check" size={14} />
              Penanda kehadiran
            </li>
          </ul>
          <h3 className="panel-sub">Tidak pernah</h3>
          <ul className="loose-list">
            <li>
              <Icon name="x" size={14} />
              Audio
            </li>
            <li>
              <Icon name="x" size={14} />
              Gambar atau tangkapan layar
            </li>
            <li>
              <Icon name="x" size={14} />
              Koordinat
            </li>
          </ul>
          <p className="panel-note" style={{ marginTop: 12, marginBottom: 0 }}>
            Justru karena itu ruang ini tetap nyaman dipakai pada sambungan yang lemah.
          </p>
        </section>
      </aside>
    </div>
  )
}
