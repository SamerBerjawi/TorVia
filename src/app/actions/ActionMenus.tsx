import { ContextMenu } from '@base-ui/react/context-menu'
import { Menu } from '@base-ui/react/menu'
import { Fragment, type ReactNode } from 'react'
import { Icon } from '../components/Icon'
import { MoreIcon } from '../icons'
import { ACTIONS, GROUP_LABEL, isEnabled, isVisible, type Action, type ActionContext, type ActionGroup } from './catalogue'

type MenuNS = typeof Menu | typeof ContextMenu

// Visual hint only; the shortcut is announced via aria-keyshortcuts so it doesn't pollute the item name.
const kbd = (s: string | undefined) => (s ? <kbd className="kbd menu__kbd" aria-hidden="true">{s === 'Delete' ? 'Del' : s.toUpperCase()}</kbd> : null)

function groups(ctx: ActionContext, include: (a: Action) => boolean): [ActionGroup, Action[]][] {
  const out = new Map<ActionGroup, Action[]>()
  for (const a of ACTIONS) {
    if (!include(a) || !isVisible(a, ctx)) continue
    const g = out.get(a.group) ?? []
    g.push(a)
    out.set(a.group, g)
  }
  return [...out]
}

/** Grouped action items for either a dropdown Menu or a ContextMenu (they share part names). */
function Items({ ns: M, ctx, include }: { ns: MenuNS; ctx: ActionContext; include: (a: Action) => boolean }) {
  return groups(ctx, include).map(([g, list], i) => (
    <Fragment key={g}>
      {i > 0 && <M.Separator className="menu__sep" />}
      <M.Group>
        <M.GroupLabel className="menu__label">{GROUP_LABEL[g]}</M.GroupLabel>
        {list.map((a) => (
          <M.Item key={a.id} className={`menu__item${a.destructive ? ' menu__item--danger' : ''}`} disabled={!isEnabled(a, ctx)} onClick={() => void a.run(ctx)} aria-keyshortcuts={a.shortcut}>
            <Icon icon={a.icon} size={15} />
            <span className="menu__text">{a.label(ctx)}</span>
            {kbd(a.shortcut)}
          </M.Item>
        ))}
      </M.Group>
    </Fragment>
  ))
}

/** Right-click menu around the torrent list. */
export function TorrentContextMenu({ ctx, children }: { ctx: ActionContext; children: ReactNode }) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="tctx">{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="menu__positioner">
          <ContextMenu.Popup className="menu__popup" aria-label="Torrent actions">
            {ctx.hashes.length === 0 ? <div className="menu__empty">Select a torrent first</div> : <Items ns={ContextMenu} ctx={ctx} include={(a) => a.needsSelection} />}
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

/** "More" dropdown with every selection action not shown as a button. */
export function MoreMenu({ ctx, exclude, label = 'More actions' }: { ctx: ActionContext; exclude: readonly string[]; label?: string }) {
  return (
    <Menu.Root>
      <Menu.Trigger className="iconbtn" aria-label={label} disabled={ctx.hashes.length === 0}><Icon icon={MoreIcon} /></Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="menu__positioner" sideOffset={6} align="end">
          <Menu.Popup className="menu__popup">
            <Items ns={Menu} ctx={ctx} include={(a) => a.needsSelection && !exclude.includes(a.id)} />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
