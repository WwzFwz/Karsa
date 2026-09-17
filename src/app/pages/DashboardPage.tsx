/**
 * The dashboard: every room a person can open.
 *
 * Shaped after Mermaid's file dashboard, which gets two things right. The cards
 * carry a picture of what is inside, so the list is scannable before it is
 * read. And the primary action -- make a new one -- is the first thing in the
 * content area rather than buried in a menu.
 *
 * What is ours: the room code is shown on every card, because a code is how
 * someone else joins, and "Bagikan" copies a link rather than opening a sharing
 * system we do not have.
 */

import { useMemo, useState } from 'react'
import { LangSwitch } from '../../components/shared/LangSwitch'
import { useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../../components/shared/icons'
import { SHAPE_LABEL } from '../../core/vocabulary'
import { ThemeSwitch } from '../../components/shared/ThemeSwitch'
import { agoLabel, lastRoom, listRooms, type RoomSummary } from '../../services/rooms/rooms'
import { RoomThumbnail } from '../../components/rooms/RoomThumbnail'
import { NewRoomDialog } from '../../components/rooms/NewRoomDialog'
import { useAnnouncer } from '../../a11y/Announcer'

type Scope = 'semua' | 'milik' | 'dibagikan'

const SCOPES: { id: Scope; label: string; icon: IconName }[] = [
  { id: 'semua', label: 'Semua ruang', icon: 'layout' },
  { id: 'milik', label: 'Milik saya', icon: 'folder' },
  { id: 'dibagikan', label: 'Dibagikan ke saya', icon: 'users' },
]

export function DashboardPage({ name }: { name: string }) {
  const navigate = useNavigate()
  const [scope, setScope] = useState<Scope>('semua')
  const [query, setQuery] = useState('')
  const [rooms, setRooms] = useState<RoomSummary[]>(() => listRooms())
  const [copied, setCopied] = useState<string | null>(null)
  const [making, setMaking] = useState(false)
  const { announce } = useAnnouncer()
  const back = useMemo(() => {
    const id = lastRoom()
    return id ? rooms.find((room) => room.id === id) ?? null : null
  }, [rooms])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms
      .filter((room) => (scope === 'semua' ? true : scope === 'milik' ? !room.shared : room.shared))
      .filter((room) => !q || room.title.toLowerCase().includes(q) || room.id.toLowerCase().includes(q))
  }, [rooms, scope, query])

  const openRoom = (id: string) => navigate(`/ruang/${id}`)

  const share = async (room: RoomSummary) => {
    const link = `${window.location.origin}/ruang/${room.id}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(room.id)
      window.setTimeout(() => setCopied(null), 2200)
    } catch {
      // Clipboard can be refused. The code is on the card either way, and a
      // code is all anyone needs to join.
      window.prompt('Salin tautan ruang ini:', link)
    }
  }

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="target" size={18} />
          </span>
          <div>
            <p className="brand-name">Karsa</p>
            <p className="brand-sub">Ruang kerja kolaboratif</p>
          </div>
        </div>

        {/* The room you just left, so leaving the dashboard is as easy as
            arriving at it. */}
        {back && (
          <button type="button" className="nav-item" onClick={() => openRoom(back.id)}>
            <Icon name="cornerDownRight" size={19} />
            <span className="nav-label">Kembali ke {back.id}</span>
          </button>
        )}

        <nav aria-label="Saringan ruang">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${scope === item.id ? 'is-active' : ''}`}
              aria-pressed={scope === item.id}
              onClick={() => setScope(item.id)}
            >
              <Icon name={item.icon} size={19} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          {/*
            A switch, drawn as one. It reads as `role="switch"` too, so a screen
            reader says "mode gelap, aktif" rather than leaving someone to guess
            what a button called "Tampilan" would do next.
          */}
          <LangSwitch />
          <ThemeSwitch />

          <div className="side-card">
            <p className="side-card-label">Masuk sebagai</p>
            <p className="side-card-value">
              <span className="avatar small" aria-hidden="true" style={{ ['--hue' as string]: '340' }}>
                {name.charAt(0)}
              </span>
              {name}
            </p>
            <p className="side-card-sub">Tanpa akun, tanpa surel</p>
          </div>
        </div>
      </aside>

      <main className="dash-main" id="isi-utama">
        <header className="dash-head">
          <div>
            <h1>Ruang</h1>
            <p className="dash-sub">
              {shown.length} ruang. Semuanya berjalan di perangkat ini.
            </p>
          </div>

          <div className="dash-actions">
            <label className="dash-search">
              <Icon name="search" size={16} />
              <input
                type="search"
                className="text-input"
                placeholder="Cari nama atau kode ruang"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Cari ruang"
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={() => setMaking(true)}>
              <Icon name="plus" size={17} />
              Ruang baru
            </button>
          </div>
        </header>

        <p className="dash-note">
          <Icon name="shield" size={15} />
          Membuat ruang tidak mengirim apa pun ke mana pun. Kode ruang itulah yang dibagikan, dan
          siapa pun yang punya kodenya bisa bergabung tanpa akun.
        </p>

        {shown.length === 0 && query.trim() ? (
          <p className="dash-empty">
            Tidak ada ruang yang cocok dengan pencarian itu.
          </p>
        ) : (
          <ul className="dash-grid">
            <li>
              <button type="button" className="room-new" onClick={() => setMaking(true)}>
                <span className="room-new-icon" aria-hidden="true">
                  <Icon name="plus" size={20} />
                </span>
                <span className="room-new-title">Ruang baru</span>
                <span className="room-new-sub">Kosong, siap diisi dengan suara</span>
              </button>
            </li>
            {shown.map((room) => (
              <li key={room.id} className="room-card">
                <button
                  type="button"
                  className="room-open"
                  onClick={() => openRoom(room.id)}
                  aria-label={`Buka ruang ${room.title}, kode ${room.id}, ${
                    room.access === 'terkunci' ? 'terkunci' : 'terbuka'
                  }, ${room.nodeCount} simpul`}
                >
                  <span className="room-thumb">
                    <RoomThumbnail id={room.id} shape={room.shape} nodeCount={room.nodeCount} />
                  </span>
                  <span className="room-body">
                    <span className="room-title">{room.title}</span>
                    <span className="room-meta">
                      <span className="pill">{room.id}</span>
                      {/* Which door this room has. A locked room behaves
                          differently for the person you send the code to, so it
                          belongs on the card and not only in a settings page. */}
                      <span className={`pill ${room.access === 'terkunci' ? 'pill-lock' : ''}`}>
                        <Icon name={room.access === 'terkunci' ? 'lock' : 'link'} size={11} />
                        {room.access === 'terkunci' ? 'terkunci' : 'terbuka'}
                      </span>
                      <span>{room.nodeCount} simpul</span>
                      <span aria-hidden="true">·</span>
                      <span>{SHAPE_LABEL[room.shape]}</span>
                    </span>
                    <span className="room-meta">
                      <Icon name="clock" size={12} />
                      {agoLabel(room.updatedAt)}
                      {room.shared && (
                        <span className="pill">
                          <Icon name="users" size={11} />
                          dibagikan
                        </span>
                      )}
                    </span>
                  </span>
                </button>

                <div className="room-foot">
                  <ul className="avatar-stack" aria-label={`${room.people.length} peserta terakhir`}>
                    {room.people.slice(0, 4).map((person) => (
                      <li
                        key={person.name}
                        className="avatar small"
                        style={{ ['--hue' as string]: String(person.hue) }}
                        title={person.name}
                      >
                        {person.name.charAt(0)}
                      </li>
                    ))}
                    {room.people.length === 0 && <li className="room-nobody">Belum ada peserta</li>}
                  </ul>

                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => share(room)}
                    title="Salin tautan ruang"
                  >
                    <Icon name={copied === room.id ? 'check' : 'link'} size={15} />
                    {copied === room.id ? 'Tersalin' : 'Bagikan'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {making && (
        <NewRoomDialog
          onClose={() => setMaking(false)}
          onCreated={(room) => {
            setMaking(false)
            setRooms(listRooms())
            announce(`Ruang ${room.title} dibuat, kode ${room.id}.`)
            openRoom(room.id)
          }}
        />
      )}
    </div>
  )
}
