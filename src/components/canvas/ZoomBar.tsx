/**
 * The zoom controls, in their own corner of the screen.
 *
 * Outside the scroll container on purpose: positioned absolutely inside it, the
 * bar scrolled away with the board and ended up hundreds of pixels off-screen.
 *
 * Zoom is a view state, not a document one (D29): two people may sit at
 * different magnifications without disagreeing about anything, because pointing
 * travels as a node id and never as a coordinate. Everything here has a
 * keyboard equivalent -- `Ctrl` with `+`, `-` and `0` -- so this bar adds a
 * route rather than owning one.
 */

import { Icon } from '../shared/icons'
import { tr } from '../../core/i18n'

export function ZoomBar({
  zoom,
  min,
  max,
  onZoom,
  onFit,
}: {
  zoom: number
  min: number
  max: number
  onZoom: (next: number) => void
  onFit: () => void
}) {
  const percent = Math.round(zoom * 100)
  return (
    <div className="zoom-bar" role="group" aria-label={tr('Perbesaran kanvas', 'Canvas zoom')}>
      <button
        type="button"
        className="icon-btn"
        aria-label={tr('Perkecil', 'Zoom out')}
        title="Perkecil (Ctrl -)"
        onClick={() => onZoom(zoom - 0.15)}
        disabled={zoom <= min + 0.001}
      >
        <Icon name="minus" size={17} />
      </button>

      {/* The number is also the way back to 1:1, which is where people reach. */}
      <button
        type="button"
        className="zoom-value"
        aria-label={`Perbesaran ${percent} persen. Kembalikan ke ukuran asli.`}
        title={tr('Kembali ke 100 persen (Ctrl 0)', 'Back to 100 per cent (Ctrl 0)')}
        onClick={() => onZoom(1)}
      >
        {percent}%
      </button>

      <button
        type="button"
        className="icon-btn"
        aria-label={tr('Perbesar', 'Zoom in')}
        title="Perbesar (Ctrl +)"
        onClick={() => onZoom(zoom + 0.15)}
        disabled={zoom >= max - 0.001}
      >
        <Icon name="plus" size={17} />
      </button>

      <span className="dock-sep" aria-hidden="true" />

      <button
        type="button"
        className="icon-btn"
        aria-label={tr('Paskan seluruh kanvas ke layar', 'Fit the whole canvas on screen')}
        title={tr('Paskan ke layar', 'Fit to screen')}
        onClick={onFit}
      >
        <Icon name="maximize" size={17} />
      </button>
    </div>
  )
}
