/**
 * The top bar: navigation toggle, room name, and the room's status on the right
 * -- the local-processing promise, who is here, share, shape, shortcuts.
 */

import type { Ref } from 'react'
import { SHAPE_LABEL } from '../../core/vocabulary'
import { useDialogs } from '../../state/dialogs/DialogProvider'
import { useDocument } from '../../state/room/DocumentProvider'
import { usePresence } from '../../state/room/PresenceProvider'
import { useView } from '../../state/room/ViewProvider'
import { Icon } from '../shared/icons'

const CONNECTION_LABEL = { connected: 'Tersambung', connecting: 'Menyambung', offline: 'Luring' } as const
const CONNECTION_HINT = {
  connected: 'Perubahan sampai ke peserta lain',
  connecting: 'Menyambung ke server; perubahan disimpan di perangkat ini dulu',
  offline: 'Hanya di perangkat ini',
} as const

export function TopBar({ barRef }: { barRef: Ref<HTMLElement> }) {
  const { doc } = useDocument()
  const { participants, selfId, connection } = usePresence()
  const { sidebarHidden, toggleSidebar } = useView()
  const dialogs = useDialogs()
  const online = participants.filter((p) => p.online)

  return (
    <header className="topbar" ref={barRef}>
      <button
        type="button"
        className="icon-btn"
        aria-pressed={!sidebarHidden}
        aria-label={sidebarHidden ? 'Tampilkan navigasi' : 'Sembunyikan navigasi'}
        title="Navigasi kiri ([)"
        onClick={toggleSidebar}
      >
        <Icon name="menu" size={19} />
      </button>

      <div className="topbar-brand">
        <span className="brand-mark" aria-hidden="true">
          <Icon name="target" size={18} />
        </span>
        <div className="brand-text">
          <p className="brand-name">Karsa</p>
          <p className="brand-sub">{doc.room.title}</p>
        </div>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-right">
        {/*
          The promise, as a status chip rather than a banner. It sits with the
          other status -- who is here -- because that is where people look for
          state. The full sentence is the tooltip and the settings page.
        */}
        <span className="mode-badge" title="Tidak ada audio yang keluar dari perangkat ini">
          <Icon name="shield" size={13} />
          Lokal
        </span>
        {/*
          Whether changes are reaching anyone. A label, not a colour alone, and
          polite live text so a screen reader hears a dropped connection.
        */}
        <span className={`mode-badge sync-chip is-${connection}`} title={CONNECTION_HINT[connection]} role="status">
          <Icon name={connection === 'offline' ? 'wifiOff' : 'wifi'} size={13} />
          {CONNECTION_LABEL[connection]}
        </span>
        <ul className="avatar-stack" aria-label={`${online.length} peserta hadir`}>
          {online.slice(0, 5).map((p) => (
            <li
              key={p.actorId}
              className={`avatar ${p.talking ? 'is-talking' : ''}`}
              style={{ ['--hue' as string]: String(p.hue) }}
              title={`${p.displayName}${p.talking ? ' — sedang bicara' : ''}${
                p.actorId === selfId ? ' (Anda)' : ''
              }`}
            >
              {p.displayName.charAt(0)}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn btn-small btn-dark"
          onClick={() => dialogs.open({ kind: 'share' })}
          title="Bagikan kode ruang"
        >
          <Icon name="share" size={15} />
          Bagikan
        </button>
        <button
          type="button"
          className="btn btn-small"
          onClick={() => dialogs.open({ kind: 'shape' })}
          title="Ganti bentuk kanvas"
        >
          <Icon name="layout" size={15} />
          <span className="hide-narrow">{SHAPE_LABEL[doc.room.shape]}</span>
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Pintasan papan ketik"
          title="Pintasan papan ketik (?)"
          onClick={() => dialogs.open({ kind: 'help' })}
        >
          <Icon name="keyboard" size={18} />
        </button>
      </div>
    </header>
  )
}
