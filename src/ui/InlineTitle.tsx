/**
 * Editing a title where it sits, instead of in a dialog.
 *
 * A dialog is the right answer when an operation needs a target, a kind and a
 * confirmation. It is the wrong answer for typing over a word: it moves focus
 * away, hides the thing being renamed, and costs two extra keystrokes to open
 * and close -- which is exactly the kind of cost this product is supposed to be
 * removing.
 *
 * Both views use this, so inline editing is not a canvas privilege. That keeps
 * rule 6 honest: the outline can do everything the canvas can.
 */

import { useEffect, useRef, useState } from 'react'
import { TITLE_MAX } from '../core/rules/invariants'

export function InlineTitle({
  value,
  onCommit,
  onCancel,
  className = '',
}: {
  value: string
  onCommit: (next: string) => void
  onCancel: () => void
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  // Guards against committing twice when Enter is followed by the blur it causes.
  const settled = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const commit = () => {
    if (settled.current) return
    settled.current = true
    const next = draft.trim()
    if (next && next !== value) onCommit(next)
    else onCancel()
  }

  const cancel = () => {
    if (settled.current) return
    settled.current = true
    onCancel()
  }

  const over = draft.trim().length > TITLE_MAX

  return (
    <input
      ref={ref}
      className={`inline-title ${over ? 'is-over' : ''} ${className}`}
      value={draft}
      aria-label="Ubah judul simpul"
      aria-invalid={over}
      maxLength={TITLE_MAX + 20}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          cancel()
        }
      }}
    />
  )
}
