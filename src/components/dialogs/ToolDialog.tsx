import { useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { Icon } from '../shared/icons'
import { TOOL_LIST } from '../../core/tools/registry'
import { useDocument } from '../../state/room/DocumentProvider'
import type { NodeId, ToolKind } from '../../core/model/types'
import { tr } from '../../core/i18n'

/**
 * Turning a node into a tool, and back.
 *
 * "Back" matters more than it looks: a tool is a way of drawing a sub-tree, so
 * switching it off can never lose anything -- the children were always ordinary
 * nodes and stay ordinary nodes. That is the property that makes tools safe to
 * try, and it is only true because no tool ever owns its own data.
 */
export function ToolDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc, tree } = useDocument()
  const node = doc.nodes[nodeId]
  const [tool, setTool] = useState<ToolKind | null>(node?.tool ?? null)
  const childCount = tree.byId.get(nodeId)?.childIds.length ?? 0

  return (
    <Dialog
      title={tr('Alat', 'Tool')}
      description={tr(
        `${node?.title ?? 'Simpul ini'} digambar sebagai alat. Anaknya tetap simpul biasa -- alat cuma cara menggambar dan mengoperasikannya, jadi mematikannya tidak menghilangkan apa pun.`,
        `${node?.title ?? 'This node'} is drawn as a tool. Its children stay ordinary nodes -- a tool is only a way of drawing and working them, so turning it off loses nothing.`,
      )}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setNodeTool', id: nodeId, tool }).ok && onClose()}
          >{tr('Terapkan', 'Apply')}</button>
        </>
      }
    >
      <fieldset className="chips chips-stack">
        <legend className="field-label">{tr('Gambar sebagai', 'Draw as')}</legend>
        <label className={`chip ${tool === null ? 'is-on' : ''}`}>
          <input type="radio" name="tool" checked={tool === null} onChange={() => setTool(null)} />
          <span>
            <strong>{tr('Simpul biasa', 'Ordinary node')}</strong>
            <span className="chip-hint">{tr('Kartu judul seperti simpul lain.', 'A titled card like any other node.')}</span>
          </span>
        </label>
        {TOOL_LIST.map((spec) => (
          <label key={spec.id} className={`chip ${tool === spec.id ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="tool"
              checked={tool === spec.id}
              onChange={() => setTool(spec.id)}
            />
            <span>
              <strong>
                <Icon name={spec.icon} size={13} /> {spec.label}
              </strong>
              <span className="chip-hint">{spec.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="panel-note" style={{ marginBottom: 0 }}>
        {childCount === 0
          ? tr(
              'Simpul ini belum punya anak. Tambah anak lebih dulu -- itulah isi alatnya.',
              'This node has no children yet. Add some first -- they are what the tool holds.',
            )
          : tr(`${childCount} anak akan jadi isinya.`, `${childCount} children will be its contents.`)}
      </p>
    </Dialog>
  )
}
