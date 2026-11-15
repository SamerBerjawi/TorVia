import { Icon } from '../components/Icon'
import { useUi } from '../uiStore'
import { MoreMenu } from './ActionMenus'
import { actionById, isEnabled, type ActionContext } from './catalogue'
import { torrentsLabel } from './run'

const PRIMARY = ['start', 'stop', 'category', 'tags', 'delete'] as const

/**
 * Bulk actions for the current selection. `bar` = labelled buttons (Graphite, Signal);
 * `toolbar` = icon buttons that stay visible, disabled without a selection (Paper).
 */
export function SelectionBar({ ctx, variant }: { ctx: ActionContext; variant: 'bar' | 'toolbar' }) {
  const clear = useUi((s) => s.clearSelection)
  const selectedCount = useUi((s) => s.selected.size)
  const primary = PRIMARY.map((id) => actionById(id)).filter((a) => a !== undefined)
  if (variant === 'bar' && selectedCount === 0) return null
  return (
    <div className={`selbar selbar--${variant}`} role="toolbar" aria-label="Selection actions">
      {variant === 'bar' && <strong className="selbar__count">{torrentsLabel(ctx.hashes.length)} selected</strong>}
      {primary.map((a) => (
        <button key={a.id} type="button" className={`${variant === 'bar' ? 'btn btn--ghost' : 'iconbtn iconbtn--ghost'}${a.destructive ? ' is-danger' : ''}`}
          disabled={!isEnabled(a, ctx)} onClick={() => void a.run(ctx)} aria-label={variant === 'toolbar' ? a.label(ctx).replace('…', '') : undefined}
          title={a.shortcut ? `${a.label(ctx)} (${a.shortcut === 'Delete' ? 'Del' : a.shortcut.toUpperCase()})` : a.label(ctx)}>
          <Icon icon={a.icon} size={15} />
          {variant === 'bar' && a.label(ctx)}
        </button>
      ))}
      <MoreMenu ctx={ctx} exclude={PRIMARY} />
      {variant === 'bar' && <button type="button" className="linkbtn selbar__clear" onClick={clear}>Clear</button>}
    </div>
  )
}
