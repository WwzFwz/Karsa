import { useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { Icon } from '../shared/icons'
import { TOOL_LIST } from '../../core/tools/registry'
import { useDocument } from '../../state/room/DocumentProvider'
import type { NodeId, ToolKind } from '../../core/model/types'

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
      title="Alat"
      description={`${node?.title ?? 'Simpul ini'} digambar sebagai alat. Anaknya tetap simpul biasa -- alat cuma cara menggambar dan mengoperasikannya, jadi mematikannya tidak menghilangkan apa pun.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setNodeTool', id: nodeId, tool }).ok && onClose()}
          >
            Terapkan
          </button>
        </>
      }
    >
      <fieldset className="chips chips-stack">
        <legend className="field-label">Gambar sebagai</legend>
        <label className={`chip ${tool === null ? 'is-on' : ''}`}>
          <input type="radio" name="tool" checked={tool === null} onChange={() => setTool(null)} />
          <span>
            <strong>Simpul biasa</strong>
            <span className="chip-hint">Kartu judul seperti simpul lain.</span>
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
          ? 'Simpul ini belum punya anak. Tambah anak lebih dulu -- itulah isi alatnya.'
          : `${childCount} anak akan jadi isinya.`}
      </p>
    </Dialog>
  )
}
