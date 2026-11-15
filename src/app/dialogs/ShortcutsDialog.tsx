import { ACTIONS } from '../actions/catalogue'
import { Modal } from './Modal'

const TABLE_KEYS: [string, string][] = [
  ['↑ ↓  or  J K', 'Move between torrents'], ['Space', 'Select / deselect'], ['Shift + click', 'Select a range'],
  ['⌘/Ctrl + click', 'Add to selection'], ['⌘/Ctrl + A', 'Select all visible'], ['Enter', 'Open details'], ['Esc', 'Close details / clear selection'],
  ['/', 'Search'], ['⌘/Ctrl + K', 'Command palette'], ['Right-click', 'Torrent menu'],
]

export function ShortcutsDialog() {
  const actionKeys = ACTIONS.filter((a) => a.shortcut && a.shortcut !== '?').map((a) => [a.shortcut === 'Delete' ? 'Delete' : a.shortcut!.toUpperCase(), a.label({ hashes: [], torrents: [], facts: { count: 0 } as never, caps: {} as never, server: {} })])
  return (
    <Modal title="Keyboard shortcuts" size="md" footer={null}>
      <dl className="shortcuts">
        {[...TABLE_KEYS, ...actionKeys].map(([k, label]) => (
          <div key={`${k}-${label}`}><dt><kbd className="kbd">{k}</kbd></dt><dd>{label}</dd></div>
        ))}
      </dl>
    </Modal>
  )
}
