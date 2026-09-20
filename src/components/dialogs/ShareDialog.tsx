import { useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { Icon } from '../shared/icons'
import { useDocument } from '../../state/room/DocumentProvider'
import { useRoomAccess } from '../../state/rooms/useRoomAccess'
import { tr } from '../../core/i18n'

/**
 * Sharing is a code, not an invitation.
 *
 * There are no accounts to invite, so what gets handed over is the room code
 * itself -- readable aloud over a call, and typed on the join page by anyone.
 * The link is a convenience on top of it, never a replacement, because a link
 * cannot be spoken.
 */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const { doc } = useDocument()
  const [copied, setCopied] = useState<'kode' | 'tautan' | null>(null)
  const link = `${window.location.origin}/ruang/${doc.room.id}`
  const locked = useRoomAccess().access !== 'terbuka'

  const copy = async (what: 'kode' | 'tautan') => {
    const text = what === 'kode' ? doc.room.id : link
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      window.setTimeout(() => setCopied(null), 2200)
    } catch {
      window.prompt(tr('Salin:', 'Copy:'), text)
    }
  }

  return (
    <Dialog
      title={tr('Bagikan ruang', 'Share room')}
      description={
        locked
          ? tr(
              'Kode ini membawa orang ke depan pintu. Permintaan masuknya muncul di panel Peserta, dan kamu yang menerima.',
              'This code brings people to the door. Their request shows up in the People panel, and you let them in.',
            )
          : tr(
              'Siapa pun yang punya kodenya langsung bergabung. Tanpa akun, tanpa undangan.',
              'Anyone with the code joins straight away. No account, no invitation.',
            )
      }
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>{tr('Selesai', 'Done')}</button>
      }
    >
      <p className="field-label">{tr('Kode ruang', 'Room code')}</p>
      <div className="share-code">
        <span>{doc.room.id}</span>
        <button type="button" className="btn btn-small" onClick={() => copy('kode')}>
          <Icon name={copied === 'kode' ? 'check' : 'copy'} size={15} />
          {copied === 'kode' ? 'Tersalin' : 'Salin kode'}
        </button>
      </div>

      <p className="field-label" style={{ marginTop: 16 }}>{tr('Tautan', 'Link')}</p>
      <div className="share-code is-quiet">
        <span>{link}</span>
        <button type="button" className="btn btn-small" onClick={() => copy('tautan')}>
          <Icon name={copied === 'tautan' ? 'check' : 'link'} size={15} />
          {copied === 'tautan' ? 'Tersalin' : 'Salin tautan'}
        </button>
      </div>

      <p className="panel-note" style={{ marginTop: 16, marginBottom: 0 }}>
        <Icon name={locked ? 'lock' : 'link'} size={14} />
        {locked
          ? tr(
              'Ruang terkunci. Kode lebih berguna daripada tautan saat rapat berjalan: ia bisa diucapkan, dan yang menunggu tetap kelihatan di panel Peserta.',
              'The room is locked. A code beats a link while a meeting is running: it can be said out loud, and whoever is waiting stays visible in the People panel.',
            )
          : tr(
              'Ruang terbuka. Kode lebih berguna daripada tautan saat rapat sedang berjalan: ia bisa diucapkan.',
              'The room is open. A code beats a link while a meeting is running: it can be said out loud.',
            )}
      </p>
    </Dialog>
  )
}
