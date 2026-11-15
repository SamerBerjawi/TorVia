import { Dialog } from '@base-ui/react/dialog'
import { useMemo, useState, type KeyboardEvent } from 'react'
import type { IconSvgElement } from '@hugeicons/react'
import { MODES, MODE_LABEL, SKINS, SKIN_LABEL, setAppearance } from '@/ui/theme'
import { ACTIONS, GROUP_LABEL, isEnabled, type ActionContext } from '../actions/catalogue'
import { Icon } from '../components/Icon'
import { AppearanceIcon, DarkIcon, LightIcon, SearchIcon, SystemIcon } from '../icons'
import { closeDialog } from './dialogStore'

interface Command { id: string; label: string; group: string; icon: IconSvgElement; shortcut?: string | undefined; run: () => void }

const MODE_ICON = { system: SystemIcon, light: LightIcon, dark: DarkIcon }

/** ⌘K: every available action, plus appearance commands. Type to filter, ↑↓ to move, Enter to run. */
export function CommandPalette({ ctx }: { ctx: ActionContext }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const commands = useMemo((): Command[] => {
    const list: Command[] = ACTIONS.filter((a) => isEnabled(a, ctx)).map((a) => ({
      id: a.id, label: a.label(ctx), group: a.needsSelection ? `${GROUP_LABEL[a.group]} · ${ctx.hashes.length} selected` : GROUP_LABEL[a.group],
      icon: a.icon, shortcut: a.shortcut, run: () => void a.run(ctx),
    }))
    for (const s of SKINS) list.push({ id: `skin-${s}`, label: `Style: ${SKIN_LABEL[s]}`, group: 'Appearance', icon: AppearanceIcon, run: () => setAppearance({ skin: s }) })
    for (const m of MODES) list.push({ id: `mode-${m}`, label: `Mode: ${MODE_LABEL[m]}`, group: 'Appearance', icon: MODE_ICON[m], run: () => setAppearance({ mode: m }) })
    return list
  }, [ctx])
  const filtered = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    return words.length ? commands.filter((c) => words.every((w) => `${c.label} ${c.group}`.toLowerCase().includes(w))) : commands
  }, [q, commands])

  const exec = (c: Command | undefined) => {
    if (!c) return
    closeDialog()
    // Let the palette close (and return focus) before the command possibly opens another dialog.
    requestAnimationFrame(c.run)
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (filtered.length ? (a + (e.key === 'ArrowDown' ? 1 : -1) + filtered.length) % filtered.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      exec(filtered[active])
    }
  }
  return (
    <Dialog.Root open onOpenChange={(o) => !o && closeDialog()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="modal-backdrop" />
        <Dialog.Popup className="modal modal--palette">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <label className="palette__search">
            <Icon icon={SearchIcon} size={16} />
            <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0) }} onKeyDown={onKey}
              placeholder={ctx.hashes.length ? `Run a command on ${ctx.hashes.length} selected…` : 'Type a command…'}
              role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={filtered[active] ? `cmd-${filtered[active].id}` : undefined} />
          </label>
          <ul className="palette__list" id="palette-list" role="listbox" aria-label="Commands">
            {filtered.length === 0 && <li className="palette__empty">No matching command.</li>}
            {filtered.map((c, i) => (
              <li key={c.id} id={`cmd-${c.id}`} role="option" aria-selected={i === active} onMouseMove={() => setActive(i)} onClick={() => exec(c)}>
                <Icon icon={c.icon} size={16} />
                <span className="palette__label">{c.label}</span>
                <span className="palette__group">{c.group}</span>
                {c.shortcut && <kbd className="kbd">{c.shortcut === 'Delete' ? 'Del' : c.shortcut.toUpperCase()}</kbd>}
              </li>
            ))}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
