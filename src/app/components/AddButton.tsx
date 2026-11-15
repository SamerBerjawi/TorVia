import { openDialog } from '../dialogs/dialogStore'
import { AddIcon } from '../icons'
import { Icon } from './Icon'

export function AddButton({ variant }: { variant: 'full' | 'compact' }) {
  return (
    <button type="button" className="btn btn--accent addbtn" onClick={() => openDialog({ kind: 'add' })} title="Add torrents (N)">
      <Icon icon={AddIcon} size={15} />
      {variant === 'full' ? <>Add torrents <kbd className="kbd kbd--on-accent">N</kbd></> : 'Add'}
    </button>
  )
}
