/**
 * Ctrl+K, and the reason it had to exist.
 *
 * The shortcut sheet advertised "Buka daftar perintah" and nothing happened.
 * For someone who navigates by keyboard, that sheet is a contract, and the one
 * entry promising access to everything was the one entry that lied.
 *
 * Shaped as a combobox over a listbox, which is the pattern screen readers
 * already know: typing filters, arrows move the active option, Enter runs it,
 * Escape leaves. The input keeps focus the whole time and announces the active
 * row through aria-activedescendant, so nothing has to steal focus mid-search.
 *
 * Commands that would change the shared document are marked, and commands that
 * cannot run right now stay visible with the reason instead of disappearing --
 * a list that hides what it cannot do teaches a shape of the product that is
 * not true (the same argument as D24).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../../ui/icons'
import { buildEntries, filterEntries, type PaletteRoom } from './entries'
import type { NavigateFunction } from 'react-router-dom'

export function CommandPalette({
  room,
  navigate,
  base,
  onClose,
}: {
  room: PaletteRoom
  navigate: NavigateFunction
  base: string
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  const all = useMemo(() => buildEntries(room, navigate, base), [room, navigate, base])
  const shown = useMemo(() => filterEntries(all, query), [all, query])

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null
    input.current?.focus()
    return () => returnTo.current?.focus()
  }, [])

  // A filtered list whose active row is off the end selects nothing on Enter.
  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, shown])

  const runAt = (index: number) => {
    const entry = shown[index]
    if (!entry || entry.disabledReason) return
    // Close first: a command that opens a dialog must not fight this one for
    // the focus it is about to take.
    onClose()
    entry.run()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        onClose()
        return
      case 'ArrowDown':
        event.preventDefault()
        setActive((current) => (shown.length ? (current + 1) % shown.length : 0))
        return
      case 'ArrowUp':
        event.preventDefault()
        setActive((current) => (shown.length ? (current - 1 + shown.length) % shown.length : 0))
        return
      case 'Home':
        event.preventDefault()
        setActive(0)
        return
      case 'End':
        event.preventDefault()
        setActive(Math.max(0, shown.length - 1))
        return
      case 'Enter':
        event.preventDefault()
        runAt(active)
        return
      default:
        return
    }
  }

  let lastGroup = ''

  return createPortal(
    <div
      className="palette-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Daftar perintah">
        <div className="palette-search">
          <Icon name="search" size={17} />
          <input
            ref={input}
            className="palette-input"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={shown[active] ? `palette-${shown[active].id}` : undefined}
            aria-autocomplete="list"
            placeholder="Cari perintah, alat, atau templat..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>

        <ul className="palette-list" id="palette-list" role="listbox" ref={list} aria-label="Perintah">
          {shown.map((entry, index) => {
            const head = entry.group !== lastGroup ? entry.group : null
            lastGroup = entry.group
            return (
              <li key={entry.id} className="palette-row">
                {head && (
                  <p className="palette-group" role="presentation">
                    {head}
                  </p>
                )}
                <div
                  id={`palette-${entry.id}`}
                  role="option"
                  aria-selected={index === active}
                  aria-disabled={Boolean(entry.disabledReason)}
                  className={`palette-item ${index === active ? 'is-active' : ''} ${
                    entry.disabledReason ? 'is-off' : ''
                  }`}
                  onMouseMove={() => setActive(index)}
                  onClick={() => runAt(index)}
                >
                  <Icon name={entry.icon} size={16} />
                  <span className="palette-label">
                    {entry.label}
                    {entry.disabledReason && (
                      <span className="palette-why">{entry.disabledReason}</span>
                    )}
                  </span>
                  {/* Named where a person is already looking, so the next time
                      they reach for the key instead of the palette. */}
                  {entry.mutates && (
                    <span className="palette-tag" title="Mengubah kanvas bersama">
                      ubah
                    </span>
                  )}
                  {entry.keys && <kbd className="palette-key">{entry.keys}</kbd>}
                </div>
              </li>
            )
          })}
          {shown.length === 0 && (
            <li className="palette-empty">Tidak ada perintah yang cocok dengan itu.</li>
          )}
        </ul>

        <p className="palette-foot">
          <Icon name="shield" size={13} />
          Semua perintah di sini juga punya jalur papan ketiknya sendiri. Yang bertanda{' '}
          <span className="palette-tag">ubah</span> menyentuh kanvas bersama dan tetap bisa
          dibatalkan.
        </p>
      </div>
    </div>,
    document.body,
  )
}
