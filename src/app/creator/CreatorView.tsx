import { useCallback, useState } from 'react'
import { creatorApi, type CreatorFormat, type CreatorTask } from '@/api/creator'
import { FORMATS, PIECE_SIZES, parseLines, pieceLabel, taskProgressPct, validateSeeds, validateSourcePath, validateTrackers } from '@/domain/creator'
import { run } from '../actions/run'
import { Icon } from '../components/Icon'
import { openDialog } from '../dialogs/dialogStore'
import { DeleteIcon } from '../icons'
import { useDetailData } from '../useDetailData'

/** Builds a .torrent from a file or folder that already exists on the qBittorrent machine. */
export default function CreatorView() {
  const load = useCallback((s: AbortSignal) => creatorApi.status(s), [])
  const tasks = useDetailData('creator', load, 2000)
  const [sourcePath, setSourcePath] = useState('')
  const [format, setFormat] = useState<CreatorFormat>('v1')
  const [pieceSize, setPieceSize] = useState(0)
  const [isPrivate, setPrivate] = useState(false)
  const [comment, setComment] = useState('')
  const [source, setSource] = useState('')
  const [trackers, setTrackers] = useState('')
  const [seeds, setSeeds] = useState('')
  const [startSeeding, setStartSeeding] = useState(true)
  const [busy, setBusy] = useState(false)

  const trackerList = parseLines(trackers)
  const seedList = parseLines(seeds)
  const errors = { path: sourcePath === '' ? null : validateSourcePath(sourcePath), trackers: validateTrackers(trackerList), seeds: validateSeeds(seedList) }
  const valid = validateSourcePath(sourcePath) === null && !errors.trackers && !errors.seeds

  if (tasks.status === 'error') {
    const unsupported = /404|not found/i.test(tasks.message)
    return (
      <div className="create"><header className="settings__head"><h1>Create torrent</h1></header>
        <p className="panel__empty" role="alert">{unsupported ? 'This qBittorrent version has no torrent creator in its WebAPI.' : tasks.message}</p>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    const ok = await run(() => creatorApi.add({ sourcePath: sourcePath.trim(), private: isPrivate, format, pieceSize, comment, source, trackers: trackerList, urlSeeds: seedList, startSeeding, optimizeAlignment: true, ignoreDotfiles: true }), { success: 'Torrent creation started', failure: 'Could not create the torrent' })
    setBusy(false)
    if (ok && tasks.status === 'ok') tasks.reload()
  }

  return (
    <div className="create">
      <header className="settings__head"><h1>Create torrent</h1></header>
      <form className="create__form" onSubmit={(e) => void submit(e)}>
        <label className="field"><span>Source path on the server</span>
          <input value={sourcePath} onChange={(e) => setSourcePath(e.target.value)} placeholder="/downloads/My.Release" aria-invalid={errors.path ? true : undefined} />
          {errors.path && <small className="field__error" role="alert">{errors.path}</small>}
        </label>
        <div className="fieldrow">
          <label className="field"><span>Format</span><select value={format} onChange={(e) => setFormat(e.target.value as CreatorFormat)}>{FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></label>
          <label className="field"><span>Piece size</span><select value={pieceSize} onChange={(e) => setPieceSize(Number(e.target.value))}>{PIECE_SIZES.map((s) => <option key={s} value={s}>{pieceLabel(s)}</option>)}</select></label>
        </div>
        <label className="field"><span>Trackers (one per line)</span>
          <textarea rows={3} value={trackers} onChange={(e) => setTrackers(e.target.value)} aria-invalid={errors.trackers ? true : undefined} />
          {errors.trackers && <small className="field__error" role="alert">{errors.trackers}</small>}
        </label>
        <label className="field"><span>Web seeds (one per line)</span>
          <textarea rows={2} value={seeds} onChange={(e) => setSeeds(e.target.value)} aria-invalid={errors.seeds ? true : undefined} />
          {errors.seeds && <small className="field__error" role="alert">{errors.seeds}</small>}
        </label>
        <div className="fieldrow">
          <label className="field"><span>Comment</span><input value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          <label className="field"><span>Source tag</span><input value={source} onChange={(e) => setSource(e.target.value)} /></label>
        </div>
        <label className="logs__follow"><input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />Private torrent (no DHT or peer exchange)</label>
        <label className="logs__follow"><input type="checkbox" checked={startSeeding} onChange={(e) => setStartSeeding(e.target.checked)} />Start seeding when finished</label>
        <div><button type="submit" className="btn btn--accent" disabled={!valid || busy}>Create torrent</button></div>
      </form>

      <h2 className="settings__sub">Tasks</h2>
      {tasks.status === 'loading' && <p className="muted" role="status">Loading…</p>}
      {tasks.status === 'ok' && tasks.data.length === 0 && <p className="muted">No tasks yet.</p>}
      {tasks.status === 'ok' && (
        <ul className="create__tasks">
          {tasks.data.map((t: CreatorTask) => (
            <li key={t.taskID}>
              <div className="create__path" title={t.sourcePath}>{t.sourcePath}</div>
              <div className="muted">{t.status}{t.status === 'Running' ? ` · ${taskProgressPct(t)}%` : ''}{t.errorMessage ? ` · ${t.errorMessage}` : ''}</div>
              {t.status === 'Finished' && <a className="btn" href={creatorApi.fileUrl(t.taskID)} download>Download .torrent</a>}
              <button type="button" className="iconbtn" aria-label={`Remove task ${t.sourcePath}`} onClick={() => openDialog({ kind: 'confirm', title: 'Remove this task?', body: 'The task entry is removed. A .torrent file already saved on the server is not deleted.', confirmLabel: 'Remove task', onConfirm: async () => { if (await run(() => creatorApi.remove(t.taskID), { success: 'Task removed', failure: 'Could not remove the task' }) && tasks.status === 'ok') tasks.reload() } })}><Icon icon={DeleteIcon} size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
