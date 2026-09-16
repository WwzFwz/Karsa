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
import { PROVIDERS, SELECTABLE } from '../features/ai/providers'
import { ASR_MODES } from '../features/voice/speech'
import { ollamaModel, ollamaUrl, setOllamaModel, setOllamaUrl } from '../config'
import { useState } from 'react'
import { setLang, tr, useLang } from '../i18n/lang'
import { MODE_HINT, MODE_LABEL } from '../ui/labels'
import { Icon } from '../ui/icons'
import type { SoundProfile } from '../audio/earcons'

const SOUND_LABEL: Record<SoundProfile, { name: string; hint: string }> = {
  silent: { name: 'Diam', hint: 'Tanpa bunyi' },
  sparse: { name: 'Hemat', hint: 'Yang penting saja' },
  full: { name: 'Penuh', hint: 'Termasuk perpindahan fokus' },
}

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: 'Ikut sistem',
  light: 'Terang',
  dark: 'Gelap',
}

export function SettingsPage() {
  const room = useRoom()
  const { mode, setMode, soundProfile, setSoundProfile } = room
  const theme = useTheme()
  const language = useLang()
  const { speechLang, setSpeechLang } = room
  const [endpoint, setEndpoint] = useState(ollamaUrl)
  const [modelName, setModelName] = useState(ollamaModel)

  return (
    <div className="page page-settings">
      <section className="settings-main">
        {/*
          Two separate choices on purpose. What the app says and what the
          person speaks are not always the same language: an Indonesian lecturer
          may present in English, and the narration should still be in the
          language they follow best.
        */}
        <section className="panel" aria-labelledby="lang-heading">
          <header className="panel-head">
            <h2 id="lang-heading">
              <Icon name="message" size={15} />
              {tr('Bahasa', 'Language')}
            </h2>
          </header>
          <span className="field-label">{tr('Narasi & usulan', 'Narration & proposals')}</span>
          <div className="option-row is-compact" role="radiogroup" aria-label={tr('Bahasa keluaran', 'Output language')}>
            {(['id', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={language === l}
                className={`option ${language === l ? 'is-on' : ''}`}
                onClick={() => setLang(l)}
              >
                <span>
                  <strong>{l === 'id' ? 'Bahasa Indonesia' : 'English'}</strong>
                </span>
              </button>
            ))}
          </div>
          <span className="field-label" style={{ marginTop: 12, display: 'block' }}>
            {tr('Didengar mikrofon', 'Heard by the microphone')}
          </span>
          <div className="option-row is-compact" role="radiogroup" aria-label={tr('Bahasa ucapan', 'Speech language')}>
            {(['auto', 'id', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={speechLang === l}
                className={`option ${speechLang === l ? 'is-on' : ''}`}
                onClick={() => setSpeechLang(l)}
              >
                <span>
                  <strong>
                    {l === 'auto' ? tr('Otomatis', 'Automatic') : l === 'id' ? 'Bahasa Indonesia' : 'English'}
                  </strong>
                </span>
              </button>
            ))}
          </div>
        </section>

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

          {/*
            Buttons, not native radios. A controlled radio group where some
            members are disabled fights React over which one the DOM thinks is
            checked, and the loser is the person clicking. `role="radio"` keeps
            the semantics a screen reader needs without the browser's own
            grouping getting a vote.
          */}
          <ul className="provider-list" role="radiogroup" aria-labelledby="provider-heading">
            {PROVIDERS.map((p) => {
              const active = p.id === room.provider
              const selectable = SELECTABLE.includes(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!selectable}
                    className={`provider ${active ? 'is-on' : 'is-off'}`}
                    onClick={() => room.setProvider(p.id as 'rules' | 'ollama')}
                  >
                    <span className="provider-mark" aria-hidden="true" />
                    <span className="provider-body">
                      <span className="provider-name">
                        {p.name}
                        {active ? (
                          <span className={`pill ${room.providerState.ready ? 'pill-ok' : 'pill-warn'}`}>
                            {room.providerState.ready ? 'aktif' : 'dipilih, belum siap'}
                          </span>
                        ) : selectable ? (
                          <span className="pill">tersedia</span>
                        ) : (
                          <span className="pill">
                            <Icon name="lock" size={11} />
                            fase lanjut
                          </span>
                        )}
                      </span>
                      <span className="provider-detail">{p.detail}</span>
                      {/* What is actually there, not what is configured. Those
                          are different facts and only one of them helps. */}
                      {active && (
                        <span className="provider-detail">
                          <strong>{room.providerState.detail}</strong>
                        </span>
                      )}
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
                  </button>
                </li>
              )
            })}
          </ul>

          {/*
            The address is editable because a deployed copy is served from a
            server while the model stays on each listener's own machine. Nothing
            here is rebuilt to change it; .env only sets what it starts as.
          */}
          {room.provider === 'ollama' && (
            <form
              className="endpoint-form"
              onSubmit={(e) => {
                e.preventDefault()
                setOllamaUrl(endpoint)
                setOllamaModel(modelName)
                room.recheckProvider()
              }}
            >
              <label className="field-label" htmlFor="ollama-url">
                {tr('Alamat Ollama di perangkat ini', 'Ollama address on this device')}
              </label>
              <div className="endpoint-row">
                <input
                  id="ollama-url"
                  className="text-input"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://localhost:11434"
                  spellCheck={false}
                />
                <input
                  className="text-input endpoint-model"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="qwen2.5:7b"
                  spellCheck={false}
                  aria-label={tr('Nama model', 'Model name')}
                />
                <button type="submit" className="btn">
                  {tr('Simpan & periksa', 'Save & check')}
                </button>
              </div>
              <details className="field-more">
                <summary>{tr('Halaman ini dari server?', 'Page served from a server?')}</summary>
                <code>OLLAMA_ORIGINS={'{'}alamat halaman{'}'}</code>
              </details>
            </form>
          )}

        </section>

        <section className="panel" aria-labelledby="asr-heading">
          <header className="panel-head">
            <h2 id="asr-heading">
              <Icon name="mic" size={15} />
              Pengenalan suara
            </h2>
            <span className="pill pill-ok">
              <Icon name="shield" size={12} />
              Di perangkat
            </span>
          </header>
          <ul className="provider-list" role="radiogroup" aria-labelledby="asr-heading">
            {ASR_MODES.map((m) => {
              const active = m.id === room.asrMode
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`provider ${active ? 'is-on' : 'is-off'}`}
                    onClick={() => room.setAsrMode(m.id)}
                  >
                    <span className="provider-mark" aria-hidden="true" />
                    <span className="provider-body">
                      <span className="provider-name">
                        {m.label}
                        {active && m.model && (
                          <span
                            className={`pill ${room.asrStatus.phase === 'ready' ? 'pill-ok' : 'pill-warn'}`}
                          >
                            {room.asrStatus.phase === 'ready'
                              ? 'siap'
                              : room.asrStatus.phase === 'loading'
                                ? `mengunduh ${room.asrStatus.percent}%`
                                : room.asrStatus.phase === 'error'
                                  ? 'gagal'
                                  : 'dimuat saat pertama bicara'}
                          </span>
                        )}
                      </span>
                      <span className="provider-detail">{m.detail}</span>
                      {active && m.model && room.asrStatus.phase !== 'idle' && (
                        <span className="provider-detail" aria-live="polite">
                          <strong>{room.asrStatus.detail}</strong>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
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
        </section>
      </aside>
    </div>
  )
}
