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
import { createRoom, hueFor, newRoomCode, type RoomAccess, type RoomSummary } from '../../services/rooms/rooms'

const TITLE_MAX = 70

const ACCESS: { id: RoomAccess; label: string; hint: string }[] = [
  {
    id: 'terkunci',
    label: 'Terkunci',
    hint: 'Orang yang punya kode menunggu di depan, dan kamu yang menerima. Permintaannya muncul di panel Peserta.',
  },
  {
    id: 'terbuka',
    label: 'Terbuka',
    hint: 'Siapa pun yang punya kode langsung masuk, tanpa menunggu diterima.',
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
  onClose,
  onCreated,
}: {
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
      window.prompt('Salin kode ruang:', code)
    }
  }

  /*
    A draft in their mail app, not a message from us. Nothing is sent, nothing
    is stored anywhere else, and reading the code out loud is still faster.
  */
  const draftInvitation = () => {
    const link = `${window.location.origin}/ruang/${code}`
    const subject = `Undangan ruang ${named || 'Karsa'}`
    const lines = [
      `Kamu diundang ke ruang "${named || 'tanpa nama'}" di Karsa.`,
      '',
      `Kode ruang: ${code}`,
      `Tautan: ${link}`,
      '',
      access === 'terkunci'
        ? 'Ruangnya terkunci: buka tautannya, lalu tunggu sebentar sampai diterima.'
        : 'Tidak perlu akun dan tidak perlu menunggu. Buka tautannya, isi nama, selesai.',
    ]
    window.location.href = `mailto:${invited.join(',')}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(lines.join('\n'))}`
  }

  const create = () => {
    if (!named || over) return
    onCreated(createRoom(named, { id: code, access, invited: invited.map(nameFromEmail) }))
  }

  return (
    <Dialog
      title="Ruang baru"
      description="Ruang dibuat di perangkat ini. Tidak ada yang dikirim ke mana pun sampai kodenya kamu bagikan."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!named || over}
            onClick={create}
          >
            <Icon name="plus" size={16} />
            Buat ruang
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="new-room-title">
        Nama ruang
      </label>
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
          ? `Terlalu panjang: ${named.length} dari ${TITLE_MAX} karakter.`
          : 'Nama ini yang muncul di daftar ruang dan dibacakan pembaca layar. Bisa diganti kapan saja.'}
      </p>

      <fieldset className="chips chips-stack" style={{ marginTop: 16 }}>
        <legend className="field-label">Siapa yang boleh masuk</legend>
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
                {option.label}
              </strong>
              <span className="chip-hint">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="field-label" style={{ marginTop: 16 }}>
        Kode ruang
      </p>
      <div className="share-code">
        <span>{code}</span>
        <button type="button" className="btn btn-small" onClick={copyCode}>
          <Icon name={copied ? 'check' : 'copy'} size={15} />
          {copied ? 'Tersalin' : 'Salin kode'}
        </button>
      </div>

      <label className="field-label" htmlFor="new-room-guest" style={{ marginTop: 16 }}>
        Undang lewat surel (opsional)
      </label>
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
          <Icon name="plus" size={15} />
          Tambah
        </button>
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
                  aria-label={`Hapus ${email} dari undangan`}
                  onClick={() => setInvited((current) => current.filter((who) => who !== email))}
                >
                  <Icon name="x" size={13} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-small guest-send" onClick={draftInvitation}>
            <Icon name="send" size={15} />
            Siapkan undangan di aplikasi surel
          </button>
        </>
      )}

      <p id="new-room-guest-help" className={`field-help ${badEmail ? 'is-error' : ''}`}>
        {badEmail
          ? 'Belum berbentuk alamat surel.'
          : 'Karsa tidak punya akun dan tidak mengirim surel sendiri. Tombolnya menyiapkan draf di aplikasi surel kamu, berisi nama ruang dan kodenya; kamu yang mengirim.'}
      </p>
    </Dialog>
  )
}
