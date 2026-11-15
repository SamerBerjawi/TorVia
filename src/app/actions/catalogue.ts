import type { IconSvgElement } from '@hugeicons/react'
import type { Capabilities } from '@/api/capabilities'
import { torrentsApi, transferApi } from '@/api/torrents'
import type { ServerState, Torrent } from '@/api/types'
import type { SelectionFacts } from '@/domain/selection'
import { copyText } from '../clipboard'
import { openDialog } from '../dialogs/dialogStore'
import { notify } from '../feedback/toast'
import * as I from '../icons'
import { hrefFor } from '../router'
import { useUi } from '../uiStore'
import { run, torrentsLabel } from './run'

export interface ActionContext {
  /** Selected hashes in table order (falls back to the focused row). */
  hashes: readonly string[]
  torrents: readonly Torrent[]
  facts: SelectionFacts
  caps: Capabilities
  server: Partial<ServerState>
}

export type ActionGroup = 'state' | 'organize' | 'queue' | 'transfer' | 'copy' | 'danger' | 'global'

export interface Action {
  id: string
  group: ActionGroup
  icon: IconSvgElement
  label: (ctx: ActionContext) => string
  /** Single key shown in menus and handled globally (outside text inputs). */
  shortcut?: string
  /** Needs a selection (else it is a global command). */
  needsSelection: boolean
  destructive?: boolean
  /** Hidden entirely when false (e.g. queue actions with queueing disabled). */
  visible?: (ctx: ActionContext) => boolean
  /** Shown but disabled when false. */
  enabled?: (ctx: ActionContext) => boolean
  run: (ctx: ActionContext) => void | Promise<unknown>
}

const n = (c: ActionContext) => c.hashes.length
const one = (c: ActionContext) => c.hashes.length === 1

async function copy(label: string, text: string) {
  notify((await copyText(text)) ? `Copied ${label}` : `Couldn't copy ${label} — your browser blocked clipboard access`, { tone: 'info' })
}

export const ACTIONS: readonly Action[] = [
  // ── State ─────────────────────────────────────────────
  { id: 'start', group: 'state', icon: I.RunningIcon, shortcut: 's', needsSelection: true, label: () => 'Start', enabled: (c) => c.facts.anyStopped,
    run: (c) => run(() => torrentsApi.start(c.hashes), { success: `Started ${torrentsLabel(n(c))}`, failure: 'Could not start' }) },
  { id: 'stop', group: 'state', icon: I.StoppedIcon, shortcut: 'x', needsSelection: true, label: () => 'Stop', enabled: (c) => c.facts.anyRunning,
    run: (c) => run(() => torrentsApi.stop(c.hashes), { success: `Stopped ${torrentsLabel(n(c))}`, failure: 'Could not stop' }) },
  { id: 'force-start', group: 'state', icon: I.ForceStartIcon, needsSelection: true, label: (c) => (c.facts.allForced ? 'Disable force start' : 'Force start'),
    run: (c) => run(() => torrentsApi.setForceStart(c.hashes, !c.facts.allForced), { success: c.facts.allForced ? 'Force start disabled' : `Force-started ${torrentsLabel(n(c))}`, failure: 'Could not change force start' }) },
  { id: 'recheck', group: 'state', icon: I.CheckingIcon, shortcut: 'r', needsSelection: true, label: () => 'Force recheck…',
    run: (c) => openDialog({
      kind: 'confirm', title: `Recheck ${torrentsLabel(n(c))}?`, confirmLabel: 'Recheck',
      body: 'qBittorrent will re-verify every piece on disk. Transfers pause until checking finishes, which can take a long time for large torrents.',
      onConfirm: () => run(() => torrentsApi.recheck(c.hashes), { success: `Rechecking ${torrentsLabel(n(c))}`, failure: 'Could not start recheck' }).then(() => undefined),
    }) },
  { id: 'reannounce', group: 'state', icon: I.ReannounceIcon, needsSelection: true, label: () => 'Reannounce to trackers',
    run: (c) => run(() => torrentsApi.reannounce(c.hashes), { success: `Reannounced ${torrentsLabel(n(c))}`, failure: 'Could not reannounce' }) },

  // ── Organize ──────────────────────────────────────────
  { id: 'category', group: 'organize', icon: I.FolderIcon, shortcut: 'c', needsSelection: true, label: () => 'Set category…', run: (c) => openDialog({ kind: 'category', hashes: c.hashes }) },
  { id: 'tags', group: 'organize', icon: I.TagIcon, shortcut: 't', needsSelection: true, label: () => 'Edit tags…', run: (c) => openDialog({ kind: 'tags', hashes: c.hashes }) },
  { id: 'location', group: 'organize', icon: I.MoveIcon, shortcut: 'l', needsSelection: true, label: () => 'Set location…', run: (c) => openDialog({ kind: 'location', hashes: c.hashes }) },
  { id: 'rename', group: 'organize', icon: I.RenameIcon, needsSelection: true, label: () => 'Rename…', enabled: one, run: (c) => { if (c.hashes[0]) openDialog({ kind: 'rename', hash: c.hashes[0] }) } },

  // ── Queue (only when queueing is enabled in qBittorrent) ──
  ...(['topPrio', 'increasePrio', 'decreasePrio', 'bottomPrio'] as const).map((move): Action => ({
    id: `queue-${move}`, group: 'queue', needsSelection: true,
    icon: move === 'topPrio' ? I.QueueTopIcon : move === 'increasePrio' ? I.ChevronUpIcon : move === 'decreasePrio' ? I.ChevronDownIcon : I.QueueBottomIcon,
    label: () => ({ topPrio: 'Move to top of queue', increasePrio: 'Move up in queue', decreasePrio: 'Move down in queue', bottomPrio: 'Move to bottom of queue' })[move],
    visible: (c) => c.server.queueing === true,
    run: (c) => run(() => torrentsApi.queue(c.hashes, move), { success: 'Queue updated', failure: 'Could not change queue position' }),
  })),

  // ── Transfer options ──────────────────────────────────
  { id: 'limits', group: 'transfer', icon: I.SpeedIcon, needsSelection: true, label: () => 'Speed limits…', run: (c) => openDialog({ kind: 'limits', hashes: c.hashes }) },
  { id: 'sequential', group: 'transfer', icon: I.SequentialIcon, needsSelection: true, label: (c) => (c.facts.allSequential ? 'Disable sequential download' : 'Download in sequential order'), enabled: (c) => !c.facts.allComplete,
    run: (c) => run(() => torrentsApi.toggleSequentialDownload(c.hashes), { success: 'Sequential download updated', failure: 'Could not change sequential download' }) },
  { id: 'first-last', group: 'transfer', icon: I.FirstLastIcon, needsSelection: true, label: (c) => (c.facts.allFirstLast ? 'Disable first & last piece priority' : 'Download first & last pieces first'), enabled: (c) => !c.facts.allComplete,
    run: (c) => run(() => torrentsApi.toggleFirstLastPiecePrio(c.hashes), { success: 'Piece priority updated', failure: 'Could not change piece priority' }) },
  { id: 'super-seeding', group: 'transfer', icon: I.UploadIcon, needsSelection: true, label: (c) => (c.facts.allSuperSeeding ? 'Disable super seeding' : 'Super seeding'), visible: (c) => c.facts.allComplete,
    run: (c) => run(() => torrentsApi.setSuperSeeding(c.hashes, !c.facts.allSuperSeeding), { success: 'Super seeding updated', failure: 'Could not change super seeding' }) },
  { id: 'auto-tmm', group: 'transfer', icon: I.AutoIcon, needsSelection: true, label: (c) => (c.facts.allAutoTMM ? 'Disable automatic management' : 'Automatic torrent management'),
    run: (c) => run(() => torrentsApi.setAutoManagement(c.hashes, !c.facts.allAutoTMM), { success: 'Automatic management updated', failure: 'Could not change automatic management' }) },

  // ── Copy ──────────────────────────────────────────────
  { id: 'copy-name', group: 'copy', icon: I.CopyIcon, needsSelection: true, label: (c) => (one(c) ? 'Copy name' : 'Copy names'), run: (c) => copy('name', c.torrents.map((t) => t.name).join('\n')) },
  { id: 'copy-hash', group: 'copy', icon: I.CopyIcon, needsSelection: true, label: (c) => (one(c) ? 'Copy info hash' : 'Copy info hashes'), run: (c) => copy('info hash', c.hashes.join('\n')) },
  { id: 'copy-magnet', group: 'copy', icon: I.TorrentFileIcon, needsSelection: true, label: (c) => (one(c) ? 'Copy magnet link' : 'Copy magnet links'),
    enabled: (c) => c.torrents.some((t) => !!t.magnet_uri), run: (c) => copy('magnet link', c.torrents.map((t) => t.magnet_uri).filter(Boolean).join('\n')) },
  { id: 'details', group: 'copy', icon: I.DetailsIcon, needsSelection: true, label: () => 'Show details', enabled: one, run: (c) => { if (c.hashes[0]) useUi.getState().openDetails(c.hashes[0]) } },

  // ── Danger ────────────────────────────────────────────
  { id: 'delete', group: 'danger', icon: I.DeleteIcon, shortcut: 'Delete', destructive: true, needsSelection: true, label: () => 'Remove…', run: (c) => openDialog({ kind: 'delete', hashes: c.hashes }) },

  // ── Global ────────────────────────────────────────────
  { id: 'add', group: 'global', icon: I.AddIcon, shortcut: 'n', needsSelection: false, label: () => 'Add torrents…', run: () => openDialog({ kind: 'add' }) },
  { id: 'alt-speed', group: 'global', icon: I.SpeedIcon, needsSelection: false, label: (c) => (c.server.use_alt_speed_limits ? 'Turn off alternative speed limits' : 'Turn on alternative speed limits'),
    run: (c) => run(() => transferApi.toggleSpeedLimitsMode(), { success: c.server.use_alt_speed_limits ? 'Alternative speed limits off' : 'Alternative speed limits on', failure: 'Could not toggle speed limits' }) },
  { id: 'session', group: 'global', icon: I.StoppedIcon, needsSelection: false, visible: (c) => c.caps.sessionPause,
    label: (c) => (c.server.session_state === false ? 'Resume session' : 'Pause session (all transfers)'),
    run: (c) => c.server.session_state === false
      ? run(() => transferApi.resumeSession(), { success: 'Session resumed', failure: 'Could not resume session' })
      : openDialog({ kind: 'confirm', title: 'Pause the whole session?', confirmLabel: 'Pause session', body: 'All torrents stop transferring until you resume the session. Individual torrent states are kept.',
          onConfirm: () => run(() => transferApi.pauseSession(), { success: 'Session paused', failure: 'Could not pause session' }).then(() => undefined) }) },
  { id: 'go-torrents', group: 'global', icon: I.TorrentsIcon, needsSelection: false, label: () => 'Go to Torrents', run: () => { location.hash = hrefFor('torrents') } },
  { id: 'go-statistics', group: 'global', icon: I.StatisticsIcon, needsSelection: false, label: () => 'Go to Statistics', run: () => { location.hash = hrefFor('statistics') } },
  { id: 'shortcuts', group: 'global', icon: I.KeyboardIcon, shortcut: '?', needsSelection: false, label: () => 'Keyboard shortcuts', run: () => openDialog({ kind: 'shortcuts' }) },
]

export const GROUP_LABEL: Record<ActionGroup, string> = {
  state: 'Torrent', organize: 'Organize', queue: 'Queue', transfer: 'Transfer', copy: 'Copy', danger: 'Remove', global: 'General',
}

export function isVisible(a: Action, c: ActionContext): boolean {
  if (a.needsSelection && c.hashes.length === 0) return false
  return a.visible ? a.visible(c) : true
}

export function isEnabled(a: Action, c: ActionContext): boolean {
  return isVisible(a, c) && (a.enabled ? a.enabled(c) : true)
}

export const actionById = (id: string) => ACTIONS.find((a) => a.id === id)
