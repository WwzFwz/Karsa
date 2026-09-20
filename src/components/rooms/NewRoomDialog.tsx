/**
 * Making a room, asked for rather than assumed.
 *
 * Pressing "Ruang baru" used to create a room called "Ruang baru" and drop you
 * into it, which meant the first thing everyone did was rename it -- and the
 * dashboard filled up with identical cards in the meantime. A name asked for
 * once at the start costs one field.
 *
 * Access is the second question because it is the one you cannot fix later
 * without embarrassment. The two states are the ones Drive and Zoom both landed
 * on: restricted with a waiting room, or anyone with the link. Locked is the
 * default for the same reason it is Zoom's -- the cost of being wrong runs one
 * way.
 *
 * Inviting takes an email address, because that is the gesture everyone already
 * knows. It stops where this product's promises stop: there are no accounts
 * here and no mail server, so nothing is sent by us and no address leaves the
 * device. The button opens a draft in the person's own mail app, carrying the
 * room name and the code. They send it, or they do not.
 *
 * The code is what actually gets someone to the door, which is why it is minted
 * before the room exists and sits here with a copy button: in a meeting, six
 * characters read aloud beat any invitation.
 */

import { useMemo, useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { Icon } from '../shared/icons'
import { createRoom, hueFor, newRoomCode, serverMode, type RoomAccess, type RoomSummary } from '../../services/rooms/rooms'
import { meFrom } from '../../state/rooms/useRoomEntry'
import { tr } from '../../core/i18n'

const TITLE_MAX = 70

const ACCESS: { id: RoomAccess; label: () => string; hint: () => string }[] = [
  {
    id: 'terkunci',
    label: () => tr('Terkunci', 'Locked'),
    hint: () =>
      tr(
        'Orang yang punya kode menunggu di depan, dan kamu yang menerima. Permintaannya muncul di panel Peserta.',
        'Whoever has the code waits at the door, and you let them in. The request shows up in the People panel.',
      ),
  },
  {
    id: 'terbuka',
    label: () => tr('Terbuka', 'Open'),
    hint: () =>
      tr(
        'Siapa pun yang punya kode langsung masuk, tanpa menunggu diterima.',
        'Anyone with the code walks straight in, with nobody to wait for.',
      ),
  },
]

/** "rina.halimah@kampus.ac.id" reads better on a card as "Rina Halimah". */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Deliberately loose. Deciding what a real address is belongs to the mail app,
// and a form that argues about one it will never send to helps nobody.
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

export function NewRoomDialog({
  name,
  onClose,
  onCreated,
}: {
  /** Who is making it: the maker is the first member. */
  name: string
  onClose: () => void
  onCreated: (room: RoomSummary) => void
}) {
  // Minted once per opening, so the code shown is the code made.
  const code = useMemo(newRoomCode, [])
  const [title, setTitle] = useState('')
  const [access, setAccess] = useState<RoomAccess>('terkunci')
  const [invited, setInvited] = useState<string[]>([])
  const [guest, setGuest] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const named = title.trim()
  const over = named.length > TITLE_MAX
  const typed = guest.trim()
  const badEmail = typed.length > 0 && !looksLikeEmail(typed)

  const addGuest = () => {
    if (!looksLikeEmail(typed)) return
    if (!invited.some((who) => who.toLowerCase() === typed.toLowerCase())) {
      setInvited((current) => [...current, typed])
    }
    setGuest('')
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch {
      // Clipboard can be refused. The code is on screen either way.
      window.prompt(tr('Salin kode ruang:', 'Copy the room code:'), code)
    }
  }

  /*
    A draft in their mail app, not a message from us. Nothing is sent, nothing
    is stored anywhere else, and reading the code out loud is still faster.
  */
  const draftInvitation = () => {
    const link = `${window.location.origin}/ruang/${code}`
    const subject = tr(`Undangan ruang ${named || 'Karsa'}`, `Invitation to ${named || 'a Karsa room'}`)
    const lines = [
      tr(
        `Kamu diundang ke ruang "${named || 'tanpa nama'}" di Karsa.`,
        `You are invited to the room "${named || 'untitled'}" on Karsa.`,
      ),
      '',
      tr(`Kode ruang: ${code}`, `Room code: ${code}`),
      tr(`Tautan: ${link}`, `Link: ${link}`),
      '',
      access === 'terkunci'
        ? tr(
            'Ruangnya terkunci: buka tautannya, lalu tunggu sebentar sampai diterima.',
            'The room is locked: open the link, then wait a moment to be let in.',
          )
        : tr(
            'Tidak perlu akun dan tidak perlu menunggu. Buka tautannya, isi nama, selesai.',
            'No account and no waiting. Open the link, type a name, done.',
          ),
    ]
    window.location.href = `mailto:${invited.join(',')}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(lines.join('\n'))}`
  }

  const create = () => {
    if (!named || over || busy) return
    setBusy(true)
    setError(null)
    createRoom(meFrom(name), named, { id: code, access })
      .then(onCreated)
      .catch((failure: Error) => {
        setError(failure.message)
        setBusy(false)
      })
  }

  return (
    <Dialog
      title={tr('Ruang baru', 'New room')}
      description={
        serverMode()
          ? tr(
              'Isi ruang disimpan di server. Suara tetap di perangkat.',
              'What is in the room is kept on the server. Voice stays on the device.',
            )
          : tr('Ruang dibuat di perangkat ini.', 'The room is created on this device.')
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!named || over || busy}
            onClick={create}
          >
            <Icon name="plus" size={16} />{tr('Buat ruang', 'Create room')}</button>
        </>
      }
    >
      <label className="field-label" htmlFor="new-room-title">{tr('Nama ruang', 'Room name')}</label>
      <input
        id="new-room-title"
        className="text-input"
        value={title}
        maxLength={TITLE_MAX + 20}
        placeholder="Rapat kurikulum semester genap"
        aria-describedby="new-room-title-help"
        aria-invalid={over}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          create()
        }}
      />
      <p id="new-room-title-help" className={`field-help ${over ? 'is-error' : ''}`}>
        {over
          ? tr(
              `Terlalu panjang: ${named.length} dari ${TITLE_MAX} karakter.`,
              `Too long: ${named.length} of ${TITLE_MAX} characters.`,
            )
          : tr(
              'Nama ini yang muncul di daftar ruang dan dibacakan pembaca layar. Bisa diganti kapan saja.',
              'This is the name in the room list and the one a screen reader says. It can be changed at any time.',
            )}
      </p>
      {error && (
        <p className="field-help is-error" role="alert">
          {error}
        </p>
      )}

      <fieldset className="chips chips-stack" style={{ marginTop: 16 }}>
        <legend className="field-label">{tr('Siapa yang boleh masuk', 'Who may enter')}</legend>
        {ACCESS.map((option) => (
          <label key={option.id} className={`chip ${access === option.id ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="access"
              checked={access === option.id}
              onChange={() => setAccess(option.id)}
            />
            <span>
              <strong>
                <Icon name={option.id === 'terkunci' ? 'lock' : 'link'} size={13} />{' '}
                {option.label()}
              </strong>
              <span className="chip-hint">{option.hint()}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="field-label" style={{ marginTop: 16 }}>{tr('Kode ruang', 'Room code')}</p>
      <div className="share-code">
        <span>{code}</span>
        <button type="button" className="btn btn-small" onClick={copyCode}>
          <Icon name={copied ? 'check' : 'copy'} size={15} />
          {copied ? tr('Tersalin', 'Copied') : tr('Salin kode', 'Copy the code')}
        </button>
      </div>

      <label className="field-label" htmlFor="new-room-guest" style={{ marginTop: 16 }}>{tr('Undang lewat surel (opsional)', 'Invite by email (optional)')}</label>
      <div className="guest-row">
        <input
          id="new-room-guest"
          className="text-input"
          type="email"
          value={guest}
          placeholder="nama@kampus.ac.id"
          aria-describedby="new-room-guest-help"
          aria-invalid={badEmail}
          onChange={(event) => setGuest(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            addGuest()
          }}
        />
        <button
          type="button"
          className="btn btn-small"
          disabled={!looksLikeEmail(typed)}
          onClick={addGuest}
        >
          <Icon name="plus" size={15} />{tr('Tambah', 'Add')}</button>
      </div>

      {invited.length > 0 && (
        <>
          <ul className="guest-list" aria-label={`${invited.length} alamat diundang`}>
            {invited.map((email) => (
              <li key={email} className="guest-chip">
                <span
                  className="avatar small"
                  aria-hidden="true"
                  style={{ ['--hue' as string]: String(hueFor(email)) }}
                >
                  {nameFromEmail(email).charAt(0)}
                </span>
                {email}
                <button
                  type="button"
                  className="guest-remove"
                  aria-label={tr(`Hapus ${email} dari undangan`, `Remove ${email} from the invitation`)}
                  onClick={() => setInvited((current) => current.filter((who) => who !== email))}
                >
                  <Icon name="x" size={13} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-small guest-send" onClick={draftInvitation}>
            <Icon name="send" size={15} />{tr('Siapkan undangan di aplikasi surel', 'Draft the invitation in your email app')}</button>
        </>
      )}

      <p id="new-room-guest-help" className={`field-help ${badEmail ? 'is-error' : ''}`}>
        {badEmail
          ? tr('Belum berbentuk alamat surel.', 'That is not an email address yet.')
          : tr(
              'Karsa tidak punya akun dan tidak mengirim surel sendiri. Tombolnya menyiapkan draf di aplikasi surel kamu, berisi nama ruang dan kodenya; kamu yang mengirim.',
              'Karsa has no accounts and sends no email itself. The button drafts one in your own email app, with the room name and code in it; you press send.',
            )}
      </p>
    </Dialog>
  )
}
