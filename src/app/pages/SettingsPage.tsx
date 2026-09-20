/**
 * Settings.
 *
 * The provider list shows options that are not built yet, disabled rather than
 * hidden. Hiding them would teach the wrong shape of the product: a person
 * should be able to see that a cloud option exists, what it would cost them in
 * privacy, and that it is off. The line that matters on each row is not the
 * model name -- it is where the words go.
 */

import { useSession } from '../../state/room/SessionProvider'
import { useAssistant } from '../../state/room/AssistantProvider'
import { useTheme, type ThemeChoice } from '../../state/theme'
import { PROVIDERS, SELECTABLE } from '../../services/ai/providers'
import { ASR_MODES } from '../../services/voice/speech'
import { ollamaModel, ollamaUrl, setOllamaModel, setOllamaUrl } from '../../core/config'
import { useState } from 'react'
import { bilingual, setLang, tr } from '../../core/i18n'
import { useLang } from '../../state/useLang'
import { MODE_HINT, MODE_LABEL } from '../../components/shared/labels'
import { Icon } from '../../components/shared/icons'
import type { SoundProfile } from '../../audio/earcons'

const SOUND_NAME: Record<SoundProfile, string> = bilingual(
  { silent: 'Diam', sparse: 'Hemat', full: 'Penuh' },
  { silent: 'Silent', sparse: 'Sparing', full: 'Full' },
)

const SOUND_HINT: Record<SoundProfile, string> = bilingual(
  { silent: 'Tanpa bunyi', sparse: 'Yang penting saja', full: 'Termasuk perpindahan fokus' },
  { silent: 'No sound at all', sparse: 'Only what matters', full: 'Every focus move too' },
)

const THEME_LABEL: Record<ThemeChoice, string> = bilingual(
  { system: 'Ikut sistem', light: 'Terang', dark: 'Gelap' },
  { system: 'Follow the system', light: 'Light', dark: 'Dark' },
)

export function SettingsPage() {
  const { mode, setMode, soundProfile, setSoundProfile } = useSession()
  const { speechLang, setSpeechLang, provider, setProvider, providerState, recheckProvider, asrMode, setAsrMode, asrStatus } = useAssistant()
  const theme = useTheme()
  const language = useLang()
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
              <Icon name="sparkles" size={15} />{tr('Penyedia model', 'Model provider')}</h2>
            <span className="pill pill-ok">
              <Icon name="shield" size={12} />{tr('Lokal', 'Local')}</span>
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
              const active = p.id === provider
              const selectable = SELECTABLE.includes(p.id)
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!selectable}
                    className={`provider ${active ? 'is-on' : 'is-off'}`}
                    onClick={() => setProvider(p.id as 'rules' | 'ollama')}
                  >
                    <span className="provider-mark" aria-hidden="true" />
                    <span className="provider-body">
                      <span className="provider-name">
                        {p.name}
                        {active ? (
                          <span className={`pill ${providerState.ready ? 'pill-ok' : 'pill-warn'}`}>
                            {providerState.ready ? tr('aktif', 'active') : tr('dipilih, belum siap', 'chosen, not ready')}
                          </span>
                        ) : selectable ? (
                          <span className="pill">{tr('tersedia', 'available')}</span>
                        ) : (
                          <span className="pill">
                            <Icon name="lock" size={11} />
                            {tr('fase lanjut', 'a later phase')}
                          </span>
                        )}
                      </span>
                      <span className="provider-detail">{p.detail}</span>
                      {/* What is actually there, not what is configured. Those
                          are different facts and only one of them helps. */}
                      {active && (
                        <span className="provider-detail">
                          <strong>{providerState.detail}</strong>
                        </span>
                      )}
                      <span
                        className={`provider-path ${
                          p.staysLocal ? '' : 'is-warn'
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
          {provider === 'ollama' && (
            <form
              className="endpoint-form"
              onSubmit={(e) => {
                e.preventDefault()
                setOllamaUrl(endpoint)
                setOllamaModel(modelName)
                recheckProvider()
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
                <code>
                  OLLAMA_ORIGINS={'{'}
                  {tr('alamat halaman', 'page origin')}
                  {'}'}
                </code>
              </details>
            </form>
          )}

        </section>

        <section className="panel" aria-labelledby="asr-heading">
          <header className="panel-head">
            <h2 id="asr-heading">
              <Icon name="mic" size={15} />{tr('Pengenalan suara', 'Speech recognition')}</h2>
            <span className="pill pill-ok">
              <Icon name="shield" size={12} />{tr('Di perangkat', 'On this device')}</span>
          </header>
          <ul className="provider-list" role="radiogroup" aria-labelledby="asr-heading">
            {ASR_MODES.map((m) => {
              const active = m.id === asrMode
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`provider ${active ? 'is-on' : 'is-off'}`}
                    onClick={() => setAsrMode(m.id)}
                  >
                    <span className="provider-mark" aria-hidden="true" />
                    <span className="provider-body">
                      <span className="provider-name">
                        {m.label()}
                        {active && m.model && (
                          <span
                            className={`pill ${asrStatus.phase === 'ready' ? 'pill-ok' : 'pill-warn'}`}
                          >
                            {asrStatus.phase === 'ready'
                              ? tr('siap', 'ready')
                              : asrStatus.phase === 'loading'
                                ? `${tr('mengunduh', 'downloading')} ${asrStatus.percent}%`
                                : asrStatus.phase === 'error'
                                  ? tr('gagal', 'failed')
                                  : tr('dimuat saat pertama bicara', 'downloads on the first sentence')}
                          </span>
                        )}
                      </span>
                      <span className="provider-detail">{m.detail()}</span>
                      {active && m.model && asrStatus.phase !== 'idle' && (
                        <span className="provider-detail" aria-live="polite">
                          <strong>{asrStatus.detail}</strong>
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
              <Icon name="presentation" size={15} />{tr('Mode sesi', 'Session mode')}</h2>
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
              <Icon name="volume" size={15} />{tr('Profil bunyi', 'Sound profile')}</h2>
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
                  <strong>{SOUND_NAME[p]}</strong>
                  <span className="option-hint">{SOUND_HINT[p]}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="theme-heading">
          <header className="panel-head">
            <h2 id="theme-heading">
              <Icon name={theme.active === 'dark' ? 'moon' : 'sun'} size={15} />{tr('Tampilan', 'Appearance')}</h2>
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

      <aside className="side-column" aria-label={tr('Catatan', 'Note')}>
        <section className="panel" aria-labelledby="promise-heading">
          <header className="panel-head">
            <h2 id="promise-heading">
              <Icon name="shield" size={15} />{tr('Yang melintasi jaringan', 'What crosses the network')}</h2>
          </header>
          <ul className="loose-list">
            <li>
              <Icon name="check" size={14} />{tr('Perubahan dokumen', 'Document changes')}</li>
            <li>
              <Icon name="check" size={14} />{tr('Penanda kehadiran', 'Presence markers')}</li>
          </ul>
          <h3 className="panel-sub">{tr('Tidak pernah', 'Never')}</h3>
          <ul className="loose-list">
            <li>
              <Icon name="x" size={14} />
              Audio
            </li>
            <li>
              <Icon name="x" size={14} />{tr('Gambar atau tangkapan layar', 'Images or screenshots')}</li>
            <li>
              <Icon name="x" size={14} />{tr('Koordinat', 'Coordinates')}</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}
