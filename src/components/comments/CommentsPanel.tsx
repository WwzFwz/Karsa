/**
 * Comments attached to ideas, not to a chat channel.
 *
 * A conversation stream would be a fourth place where meaning lives, and a
 * blind participant would have to hold canvas and chat in their head at the
 * same time. Anchoring every remark to a node keeps one model, and lets the
 * outline announce "two comments unresolved" as part of the row itself.
 */

import { useMemo, useState } from 'react'
import { useDocument } from '../../state/room/DocumentProvider'
import { useView } from '../../state/room/ViewProvider'
import { Icon } from '../shared/icons'
import { tr } from '../../core/i18n'

function timeAgo(at: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return tr(`${minutes} menit lalu`, `${minutes} min ago`)
  return tr(`${Math.round(minutes / 60)} jam lalu`, `${Math.round(minutes / 60)} h ago`)
}

export function CommentsPanel() {
  const { doc, run, nameOf } = useDocument()
  const { focusId, setFocus } = useView()
  const [showResolved, setShowResolved] = useState(false)
  const [reply, setReply] = useState('')

  const threads = useMemo(() => {
    const roots = Object.values(doc.comments)
      .filter((c) => !c.replyToId)
      .filter((c) => showResolved || !c.resolvedAt)
      .sort((a, b) => b.createdAt - a.createdAt)
    return roots.map((root) => ({
      root,
      replies: Object.values(doc.comments)
        .filter((c) => c.replyToId === root.id)
        .sort((a, b) => a.createdAt - b.createdAt),
    }))
  }, [doc.comments, showResolved])

  const focusNode = focusId ? doc.nodes[focusId] : null

  return (
    <section className="panel" aria-labelledby="comments-heading">
      <header className="panel-head">
        <h2 id="comments-heading">
          <Icon name="message" size={15} />{tr('Percakapan pada elemen', 'Conversation on an element')}</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
          />{tr('Tampilkan yang selesai', 'Show resolved')}</label>
      </header>

      <ul className="threads">
        {threads.map(({ root, replies }) => {
          const target = doc.nodes[root.targetId]
          return (
            <li key={root.id} className={`thread ${root.resolvedAt ? 'is-resolved' : ''}`}>
              <p className="thread-anchor">
                <Icon name="cornerDownRight" size={12} />
                <button type="button" className="link" onClick={() => target && setFocus(target.id)}>
                  {target?.title ?? tr('Elemen yang sudah dihapus', 'An element that was deleted')}
                </button>
              </p>
              <p className="thread-body">{root.body}</p>
              <p className="thread-meta">
                {nameOf(root.authorId)} · {timeAgo(root.createdAt)}
              </p>
              {replies.map((r) => (
                <div key={r.id} className="thread-reply">
                  <p className="thread-body">{r.body}</p>
                  <p className="thread-meta">
                    {nameOf(r.authorId)} · {timeAgo(r.createdAt)}
                  </p>
                </div>
              ))}
              {!root.resolvedAt && (
                <div className="thread-actions">
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => run({ type: 'resolveComment', id: root.id })}
                  >
                    <Icon name="check" size={14} />{tr('Tandai selesai', 'Mark resolved')}</button>
                </div>
              )}
            </li>
          )
        })}
        {threads.length === 0 && <li className="empty">{tr('Belum ada komentar.', 'No comments yet.')}</li>}
      </ul>

      <div className="composer">
        <label className="field-label" htmlFor="new-comment">
          {tr(
            `Komentar pada ${focusNode ? `"${focusNode.title}"` : 'simpul yang sedang difokus'}`,
            `Comment on ${focusNode ? `"${focusNode.title}"` : 'the focused node'}`,
          )}
        </label>
        <textarea
          id="new-comment"
          className="text-input"
          rows={3}
          value={reply}
          disabled={!focusNode}
          onChange={(e) => setReply(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={!focusNode || !reply.trim()}
          onClick={() => {
            if (!focusNode) return
            const result = run({
              type: 'addComment',
              targetType: 'node',
              targetId: focusNode.id,
              body: reply,
            })
            if (result.ok) setReply('')
          }}
        >
          <Icon name="send" size={15} />{tr('Kirim komentar', 'Send comment')}</button>
      </div>
    </section>
  )
}
