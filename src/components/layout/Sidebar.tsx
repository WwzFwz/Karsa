/**
 * The left navigation: three places, the language and theme switches, and the
 * room code card.
 */

import { NavLink, useLocation } from 'react-router-dom'
import { followOutputLanguage } from '../../services/voice/speech'
import { useAssistant } from '../../state/room/AssistantProvider'
import { useDocument } from '../../state/room/DocumentProvider'
import { Icon, type IconName } from '../shared/icons'
import { LangSwitch } from '../shared/LangSwitch'
import { ThemeSwitch } from '../shared/ThemeSwitch'

/*
  Three places, not six. The room is one workspace whose arrangement and side
  panel are switched inside it; only the session summary and the settings are
  genuinely different pages. Six tabs, two of which repeated the contents of the
  others, made a person guess which copy was real.
*/
const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '..', label: 'Dasbor', icon: 'home' },
  { to: '', label: 'Ruang', icon: 'layout' },
  { to: 'ringkasan', label: 'Ringkasan', icon: 'activity' },
  { to: 'pengaturan', label: 'Pengaturan', icon: 'settings' },
]

export function Sidebar({ base }: { base: string }) {
  const { doc, tree } = useDocument()
  const { draft } = useAssistant()
  const { pathname } = useLocation()

  const pendingOps = draft.status === 'ready' ? draft.operations.filter((o) => o.accepted).length : 0
  const openComments = Object.values(doc.comments).filter((c) => !c.resolvedAt).length
  const badgeFor = (label: string): number => (label === 'Ruang' ? pendingOps + openComments : 0)

  return (
    <aside className="sidebar" aria-label="Navigasi dan setelan">
      <nav aria-label="Tampilan ruang">
        {TABS.map((tab) => {
          const badge = badgeFor(tab.label)
          return (
            <NavLink
              key={tab.label}
              to={tab.to === '..' ? '/ruang' : tab.to ? `${base}/${tab.to}` : base}
              className={({ isActive }) => {
                // "Ruang" covers every arrangement of the workspace, so it
                // stays lit unless one of the two real pages is open.
                const active =
                  tab.to === '..'
                    ? false
                    : tab.to === ''
                      ? !pathname.endsWith('/ringkasan') && !pathname.endsWith('/pengaturan')
                      : isActive
                return `nav-item ${active ? 'is-active' : ''}`
              }}
            >
              <Icon name={tab.icon} size={19} />
              <span className="nav-label">{tab.label}</span>
              {badge > 0 && <span className="nav-badge">{badge}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <LangSwitch onChange={() => followOutputLanguage()} />
        {/*
          A switch, drawn as one. It reads as `role="switch"` too, so a screen
          reader says "mode gelap, aktif" rather than leaving someone to guess.
        */}
        <ThemeSwitch />

        <div className="side-card">
          <p className="side-card-label">Kode ruang</p>
          <p className="side-card-value">{doc.room.id}</p>
          <p className="side-card-sub">{Object.keys(doc.nodes).length} simpul</p>
          {tree.repairs.length > 0 && (
            <p className="side-card-alert">
              <Icon name="alert" size={12} />
              {tree.repairs.length} pemulihan bentrok
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
