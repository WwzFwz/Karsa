/**
 * Every mutating operation has a dialog, and every dialog is reachable from a
 * shortcut. That is rule 6 in practice: the canvas cannot do anything the
 * outline cannot, because neither of them owns an operation -- the dialogs do.
 *
 * Mounted once, inside DialogProvider; shows whichever dialog is open.
 */

import { useDialogs } from '../../state/dialogs/DialogProvider'
import { CreateDialog } from './node/CreateDialog'
import { RenameDialog } from './node/RenameDialog'
import { KindDialog } from './node/KindDialog'
import { StateDialog } from './node/StateDialog'
import { NoteDialog } from './node/NoteDialog'
import { MoveDialog } from './node/MoveDialog'
import { RelateDialog } from './node/RelateDialog'
import { DeleteDialog } from './node/DeleteDialog'
import { CommentDialog } from './CommentDialog'
import { ShareDialog } from './ShareDialog'
import { ToolDialog } from './ToolDialog'
import { ShapeDialog } from './ShapeDialog'
import { HelpDialog } from './HelpDialog'

export function DialogHost() {
  const { current: request, close: onClose } = useDialogs()
  if (!request) return null
  switch (request.kind) {
    case 'create':
      return <CreateDialog parentId={request.parentId} afterId={request.afterId} onClose={onClose} />
    case 'rename':
      return <RenameDialog nodeId={request.nodeId} onClose={onClose} />
    case 'setKind':
      return <KindDialog nodeId={request.nodeId} onClose={onClose} />
    case 'setState':
      return <StateDialog nodeId={request.nodeId} onClose={onClose} />
    case 'note':
      return <NoteDialog nodeId={request.nodeId} onClose={onClose} />
    case 'move':
      return (
        <MoveDialog nodeId={request.nodeId} presetParent={request.presetParent} onClose={onClose} />
      )
    case 'relate':
      return (
        <RelateDialog nodeId={request.nodeId} presetTarget={request.presetTarget} onClose={onClose} />
      )
    case 'comment':
      return <CommentDialog nodeId={request.nodeId} onClose={onClose} />
    case 'delete':
      return <DeleteDialog nodeId={request.nodeId} onClose={onClose} />
    case 'share':
      return <ShareDialog onClose={onClose} />
    case 'tool':
      return <ToolDialog nodeId={request.nodeId} onClose={onClose} />
    case 'shape':
      return <ShapeDialog onClose={onClose} />
    case 'help':
      return <HelpDialog onClose={onClose} />
  }
}
