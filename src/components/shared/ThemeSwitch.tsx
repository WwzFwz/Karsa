/**
 * The light/dark control, drawn as the thing it is.
 *
 * It was a button that said "Tampilan" with the current mode as a word beside
 * it, which left the reader to work out that pressing it would change that
 * word. A switch says what will happen without being read: the track is off or
 * on, and the knob sits on the side it is on.
 *
 * `role="switch"` carries the same fact to a screen reader -- "mode gelap,
 * aktif" -- so the two audiences learn the same thing, which is the whole rule
 * this product runs on. It is still a button underneath, so Space and Enter
 * work without anything being reimplemented.
 */

import { Icon } from './icons'
import { useTheme } from '../../state/theme'
import { tr } from '../../core/i18n'

export function ThemeSwitch() {
  const theme = useTheme()
  const dark = theme.active === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      className={`theme-switch ${dark ? 'is-on' : ''}`}
      onClick={theme.toggle}
    >
      <Icon name="moon" size={16} />
      <span className="theme-switch-label">{tr('Mode gelap', 'Dark mode')}</span>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob">
          <Icon name={dark ? 'moon' : 'sun'} size={11} />
        </span>
      </span>
    </button>
  )
}
