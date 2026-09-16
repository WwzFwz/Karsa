/**
 * Output language, drawn to match the theme switch exactly.
 *
 * Same row, same height, same place: two controls of the same shape stacked in
 * the sidebar foot, rather than one chip wedged between the two twin buttons in
 * the dock, which is where this used to live and where it broke the one piece
 * of symmetry the dock is supposed to keep.
 *
 * Two segments instead of a track, because a switch implies on and off while a
 * language is a choice between two named things.
 */

import { Icon } from './icons'
import { lang, setLang, type Lang } from '../core/i18n'
import { useLang } from './useLang'

const OPTIONS: { id: Lang; short: string; full: string }[] = [
  { id: 'id', short: 'ID', full: 'Bahasa Indonesia' },
  { id: 'en', short: 'EN', full: 'English' },
]

export function LangSwitch({ onChange }: { onChange?: (next: Lang) => void }) {
  const current = useLang()

  return (
    <div className="lang-switch">
      <Icon name="message" size={16} />
      <span className="lang-switch-label">{current === 'en' ? 'Language' : 'Bahasa'}</span>
      <div className="seg" role="radiogroup" aria-label={current === 'en' ? 'Language' : 'Bahasa'}>
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={current === option.id}
            aria-label={option.full}
            className={`seg-item ${current === option.id ? 'is-on' : ''}`}
            onClick={() => {
              if (lang() === option.id) return
              setLang(option.id)
              onChange?.(option.id)
            }}
          >
            {option.short}
          </button>
        ))}
      </div>
    </div>
  )
}
