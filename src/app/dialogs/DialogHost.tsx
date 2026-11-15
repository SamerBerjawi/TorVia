import type { ActionContext } from '../actions/catalogue'
import { AddDialog } from './AddDialog'
import { CommandPalette } from './CommandPalette'
import { useDialogs } from './dialogStore'
import { ShortcutsDialog } from './ShortcutsDialog'
import { CategoryDialog, ConfirmDialog, DeleteDialog, LimitsDialog, LocationDialog, RenameDialog, TagsDialog } from './TorrentDialogs'

/** Renders whichever dialog is open. One place, so focus management and stacking stay predictable. */
export function DialogHost({ ctx }: { ctx: ActionContext }) {
  const d = useDialogs((s) => s.current)
  if (!d) return null
  switch (d.kind) {
    case 'add': return <AddDialog links={d.links} files={d.files} />
    case 'delete': return <DeleteDialog hashes={d.hashes} />
    case 'location': return <LocationDialog hashes={d.hashes} />
    case 'rename': return <RenameDialog hash={d.hash} />
    case 'category': return <CategoryDialog hashes={d.hashes} />
    case 'tags': return <TagsDialog hashes={d.hashes} />
    case 'limits': return <LimitsDialog hashes={d.hashes} />
    case 'confirm': return <ConfirmDialog {...d} />
    case 'palette': return <CommandPalette ctx={ctx} />
    case 'shortcuts': return <ShortcutsDialog />
  }
}
