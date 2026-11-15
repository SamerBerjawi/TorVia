import { useEffect, useMemo, useState } from 'react'
import { torrentsApi } from '@/api/torrents'
import { formatSpeed } from '@/domain/format'
import { selectionFacts } from '@/domain/selection'
import { run, torrentsLabel } from '../actions/run'
import { useTorrentsByHash } from '../actions/useActionContext'
import { FileIcon } from '../components/FileIcon'
import { Icon } from '../components/Icon'
import { AlertIcon, CheckIcon, MixedIcon } from '../icons'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import { closeDialog } from './dialogStore'
import { CancelButton, Modal } from './Modal'

/** Shared busy-state + close-on-success wrapper for dialog submissions. */
function useSubmit() {
  const [busy, setBusy] = useState(false)
  const submit = async (fn: () => Promise<boolean>) => {
    if (busy) return
    setBusy(true)
    const ok = await fn()
    setBusy(false)
    if (ok) closeDialog()
  }
  return { busy, submit }
}

function Subject({ hashes }: { hashes: readonly string[] }) {
  const torrents = useTorrentsByHash(hashes)
  if (torrents.length === 1 && torrents[0]) {
    return <p className="subject"><FileIcon name={torrents[0].name} /><span>{torrents[0].name}</span></p>
  }
  return (
    <div className="subject subject--many">
      <strong>{torrentsLabel(torrents.length)}</strong>
      <ul>{torrents.slice(0, 4).map((t) => <li key={t.name}><FileIcon name={t.name} size={14} />{t.name}</li>)}</ul>
      {torrents.length > 4 && <span className="muted">and {torrents.length - 4} more</span>}
    </div>
  )
}

export function DeleteDialog({ hashes }: { hashes: readonly string[] }) {
  const [withFiles, setWithFiles] = useState(false)
  const { busy, submit } = useSubmit()
  const count = hashes.length
  return (
    <Modal
      alert
      size="sm"
      title={`Remove ${torrentsLabel(count)}?`}
      description="Removing stops the transfer and drops the torrent from qBittorrent."
      onSubmit={() => submit(() => run(() => torrentsApi.delete(hashes, withFiles), {
        success: withFiles ? `Removed ${torrentsLabel(count)} and deleted files` : `Removed ${torrentsLabel(count)}`,
        failure: 'Could not remove',
      }).then((ok) => { if (ok) useUi.getState().clearSelection(); return ok }))}
      footer={<>
        <CancelButton />
        <button type="submit" className="btn btn--danger" disabled={busy} autoFocus>{withFiles ? 'Remove and delete files' : 'Remove'}</button>
      </>}
    >
      <Subject hashes={hashes} />
      <label className="check check--danger">
        <input type="checkbox" checked={withFiles} onChange={(e) => setWithFiles(e.target.checked)} />
        <span>Also delete downloaded files from disk</span>
      </label>
      {withFiles && <p className="warn"><Icon icon={AlertIcon} size={14} />Files are deleted permanently. This cannot be undone.</p>}
    </Modal>
  )
}

export function ConfirmDialog({ title, body, confirmLabel, destructive, onConfirm }: { title: string; body: string; confirmLabel: string; destructive?: boolean | undefined; onConfirm: () => Promise<void> }) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal alert size="sm" title={title} description={body}
      onSubmit={() => { setBusy(true); void onConfirm().finally(() => { setBusy(false); closeDialog() }) }}
      footer={<><CancelButton /><button type="submit" className={destructive ? 'btn btn--danger' : 'btn btn--accent'} disabled={busy} autoFocus>{confirmLabel}</button></>}
    />
  )
}

export function LocationDialog({ hashes }: { hashes: readonly string[] }) {
  const torrents = useTorrentsByHash(hashes)
  const [path, setPath] = useState(() => selectionFacts(torrents).commonSavePath ?? '')
  const { busy, submit } = useSubmit()
  const valid = path.trim().length > 0
  return (
    <Modal title="Set location" description="Downloaded files are moved to the new folder. Large torrents can take a while."
      onSubmit={() => valid && submit(() => run(() => torrentsApi.setLocation(hashes, path.trim()), { success: `Moving ${torrentsLabel(hashes.length)}`, failure: 'Could not change location' }))}
      footer={<><CancelButton /><button type="submit" className="btn btn--accent" disabled={busy || !valid}>Move</button></>}
    >
      <Subject hashes={hashes} />
      <label className="field"><span>Folder on the qBittorrent machine</span>
        <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/downloads/linux" autoFocus required spellCheck={false} />
      </label>
    </Modal>
  )
}

export function RenameDialog({ hash }: { hash: string }) {
  const torrent = useEngine().data.torrents.get(hash)
  const [name, setName] = useState(torrent?.name ?? '')
  const { busy, submit } = useSubmit()
  const valid = name.trim().length > 0 && name.trim() !== torrent?.name
  return (
    <Modal title="Rename torrent" description="Changes the name shown in qBittorrent. Files on disk keep their names."
      onSubmit={() => valid && submit(() => run(() => torrentsApi.rename(hash, name.trim()), { success: 'Renamed', failure: 'Could not rename' }))}
      footer={<><CancelButton /><button type="submit" className="btn btn--accent" disabled={busy || !valid}>Rename</button></>}
    >
      <label className="field"><span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required spellCheck={false} onFocus={(e) => e.target.select()} />
      </label>
    </Modal>
  )
}

export function CategoryDialog({ hashes }: { hashes: readonly string[] }) {
  const { data } = useEngine()
  const torrents = useTorrentsByHash(hashes)
  const current = selectionFacts(torrents).commonCategory
  const categories = useMemo(() => [...data.categories.keys()].sort((a, b) => a.localeCompare(b)), [data.categories])
  const [choice, setChoice] = useState<string>(current ?? '')
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')
  const { busy, submit } = useSubmit()
  const creating = choice === '\u0000new'
  const target = creating ? newName.trim() : choice
  const valid = !creating || (target.length > 0 && !data.categories.has(target))
  return (
    <Modal title="Set category"
      onSubmit={() => valid && submit(async () => {
        if (creating) {
          const ok = await run(() => torrentsApi.createCategory(target, newPath.trim()), { success: `Created category “${target}”`, failure: 'Could not create category' })
          if (!ok) return false
        }
        return run(() => torrentsApi.setCategory(hashes, target), { success: target ? `Moved ${torrentsLabel(hashes.length)} to “${target}”` : 'Category removed', failure: 'Could not set category' })
      })}
      footer={<><CancelButton /><button type="submit" className="btn btn--accent" disabled={busy || !valid}>Apply</button></>}
    >
      <Subject hashes={hashes} />
      <fieldset className="choices">
        <legend className="sr-only">Category</legend>
        <label className="choice"><input type="radio" name="cat" checked={choice === ''} onChange={() => setChoice('')} />No category</label>
        {categories.map((c) => (
          <label key={c} className="choice"><input type="radio" name="cat" checked={choice === c} onChange={() => setChoice(c)} />{c}
            {data.categories.get(c)?.savePath && <span className="muted">{data.categories.get(c)?.savePath}</span>}
          </label>
        ))}
        <label className="choice"><input type="radio" name="cat" checked={creating} onChange={() => setChoice('\u0000new')} />New category…</label>
      </fieldset>
      {creating && (
        <div className="fieldrow">
          <label className="field"><span>Name</span><input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus required />
            {newName.trim() && data.categories.has(newName.trim()) && <small className="field__error">That category already exists.</small>}
          </label>
          <label className="field"><span>Save path (optional)</span><input value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="Default save path" spellCheck={false} /></label>
        </div>
      )}
      <p className="hint">With automatic torrent management on, changing category also moves files to that category's folder.</p>
    </Modal>
  )
}

type TagState = 'all' | 'some' | 'none'

export function TagsDialog({ hashes }: { hashes: readonly string[] }) {
  const { data } = useEngine()
  const torrents = useTorrentsByHash(hashes)
  const counts = useMemo(() => selectionFacts(torrents).tagCounts, [torrents])
  const initial = useMemo(() => {
    const m = new Map<string, TagState>()
    for (const t of new Set([...data.tags, ...counts.keys()])) {
      const c = counts.get(t) ?? 0
      m.set(t, c === 0 ? 'none' : c === torrents.length ? 'all' : 'some')
    }
    return m
  }, [data.tags, counts, torrents.length])
  const [state, setState] = useState(initial)
  const [newTag, setNewTag] = useState('')
  useEffect(() => setState((s) => new Map([...initial, ...s])), [initial])
  const { busy, submit } = useSubmit()
  const tags = [...state.keys()].sort((a, b) => a.localeCompare(b))
  const toAdd = tags.filter((t) => state.get(t) === 'all' && initial.get(t) !== 'all')
  const toRemove = tags.filter((t) => state.get(t) === 'none' && initial.get(t) !== 'none')
  const changed = toAdd.length + toRemove.length > 0

  const cycle = (t: string) => setState((s) => new Map(s).set(t, s.get(t) === 'all' ? 'none' : 'all'))
  const addNew = () => {
    const t = newTag.trim().replace(/,/g, '')
    if (t) setState((s) => new Map(s).set(t, 'all'))
    setNewTag('')
  }
  return (
    <Modal title="Edit tags" description={torrents.length > 1 ? 'A dash means only some of the selected torrents have the tag. Click to apply to all or none.' : undefined}
      onSubmit={() => changed && submit(async () => {
        let ok = true
        if (toAdd.length) ok = await run(() => torrentsApi.addTags(hashes, toAdd), { success: `Added ${toAdd.join(', ')}`, failure: 'Could not add tags' })
        if (ok && toRemove.length) ok = await run(() => torrentsApi.removeTags(hashes, toRemove), { success: `Removed ${toRemove.join(', ')}`, failure: 'Could not remove tags' })
        return ok
      })}
      footer={<><CancelButton /><button type="submit" className="btn btn--accent" disabled={busy || !changed}>Apply</button></>}
    >
      <Subject hashes={hashes} />
      {tags.length === 0 && <p className="hint">No tags yet — create one below.</p>}
      <div className="tagpick" role="group" aria-label="Tags">
        {tags.map((t) => {
          const s = state.get(t) ?? 'none'
          return (
            <button key={t} type="button" className="tagpick__tag" role="checkbox" aria-checked={s === 'all' ? true : s === 'some' ? 'mixed' : false} onClick={() => cycle(t)}>
              <span className="tagpick__box" aria-hidden="true">{s === 'all' ? <Icon icon={CheckIcon} size={12} /> : s === 'some' ? <Icon icon={MixedIcon} size={12} /> : null}</span>
              {t}
            </button>
          )
        })}
      </div>
      <div className="fieldrow fieldrow--inline">
        <label className="field"><span>New tag</span><input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNew() } }} /></label>
        <button type="button" className="btn" onClick={addNew} disabled={!newTag.trim()}>Add tag</button>
      </div>
    </Modal>
  )
}

const KIB = 1024

export function LimitsDialog({ hashes }: { hashes: readonly string[] }) {
  const torrents = useTorrentsByHash(hashes)
  const first = torrents[0]
  const kib = (b: number | undefined) => (b && b > 0 ? String(Math.round(b / KIB)) : '')
  const [dl, setDl] = useState(torrents.length === 1 ? kib(first?.dl_limit) : '')
  const [up, setUp] = useState(torrents.length === 1 ? kib(first?.up_limit) : '')
  const { busy, submit } = useSubmit()
  const parse = (v: string) => (v.trim() === '' ? 0 : Number(v))
  const valid = [dl, up].every((v) => v.trim() === '' || (Number.isFinite(Number(v)) && Number(v) >= 0))
  return (
    <Modal title="Speed limits" description="Per-torrent limits. Leave empty or 0 for unlimited (global limits still apply)."
      onSubmit={() => valid && submit(async () => {
        const d = parse(dl) * KIB
        const u = parse(up) * KIB
        return run(async () => { await torrentsApi.setDownloadLimit(hashes, d); await torrentsApi.setUploadLimit(hashes, u) }, {
          success: `Limits: ↓ ${d ? formatSpeed(d) : 'unlimited'} · ↑ ${u ? formatSpeed(u) : 'unlimited'}`, failure: 'Could not set limits',
        })
      })}
      footer={<><CancelButton /><button type="submit" className="btn btn--accent" disabled={busy || !valid}>Apply</button></>}
    >
      <Subject hashes={hashes} />
      <div className="fieldrow">
        <label className="field"><span>Download (KiB/s)</span><input inputMode="numeric" value={dl} onChange={(e) => setDl(e.target.value)} placeholder="Unlimited" autoFocus /></label>
        <label className="field"><span>Upload (KiB/s)</span><input inputMode="numeric" value={up} onChange={(e) => setUp(e.target.value)} placeholder="Unlimited" /></label>
      </div>
      {!valid && <small className="field__error">Enter a positive number or leave empty.</small>}
    </Modal>
  )
}
