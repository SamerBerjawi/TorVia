import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { addTorrents, appApi, type AddOptions } from '@/api/torrents'
import { parseLinks } from '@/domain/selection'
import { describeError, notify } from '../feedback/toast'
import { FileIcon } from '../components/FileIcon'
import { Icon } from '../components/Icon'
import { AttachIcon, CloseIcon, LinkIcon } from '../icons'
import { useServerInfo } from '../serverInfo'
import { engine, useEngine } from '../store'
import { closeDialog } from './dialogStore'
import { CancelButton, Modal } from './Modal'

const isTorrentFile = (f: File) => f.name.toLowerCase().endsWith('.torrent') || f.type === 'application/x-bittorrent'

/** Add torrents from magnet links / URLs and .torrent files, with the common options. */
export function AddDialog({ links: initialLinks = '', files: initialFiles = [] }: { links?: string | undefined; files?: readonly File[] | undefined }) {
  const { data } = useEngine()
  const { caps } = useServerInfo()
  const [text, setText] = useState(initialLinks)
  const [files, setFiles] = useState<File[]>(() => initialFiles.filter(isTorrentFile))
  const [savepath, setSavepath] = useState('')
  const [defaultPath, setDefaultPath] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [start, setStart] = useState(true)
  const [skipChecking, setSkipChecking] = useState(false)
  const [sequential, setSequential] = useState(false)
  const [firstLastPiece, setFirstLastPiece] = useState(false)
  const [addToTop, setAddToTop] = useState(false)
  const [contentLayout, setContentLayout] = useState<AddOptions['contentLayout']>('Original')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    appApi.defaultSavePath().then((p) => setDefaultPath(p.trim()), () => setDefaultPath(null))
  }, [])

  const categories = useMemo(() => [...data.categories.keys()].sort((a, b) => a.localeCompare(b)), [data.categories])
  const links = useMemo(() => parseLinks(text), [text])
  const unrecognised = useMemo(() => text.split('\n').map((l) => l.trim()).filter((l) => l && parseLinks(l).length === 0), [text])
  const total = links.length + files.length
  const categoryPath = category ? data.categories.get(category)?.savePath : undefined

  const addFiles = (list: FileList | readonly File[] | null) => {
    if (!list) return
    const incoming = [...list]
    const torrents = incoming.filter(isTorrentFile)
    if (torrents.length < incoming.length) setError(`${incoming.length - torrents.length} file(s) ignored — only .torrent files can be added.`)
    setFiles((cur) => [...cur, ...torrents.filter((f) => !cur.some((c) => c.name === f.name && c.size === f.size))])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
    const dropped = e.dataTransfer.getData('text/plain')
    if (dropped && parseLinks(dropped).length) setText((t) => (t ? `${t}\n${dropped}` : dropped))
  }

  async function submit() {
    if (total === 0 || busy) return
    setBusy(true)
    setError(null)
    try {
      const r = await addTorrents({
        urls: links, files, savepath, category, tags: tags.split(',').map((t) => t.trim()).filter(Boolean), start, skipChecking,
        sequential, firstLastPiece, addToTop, contentLayout, autoTMM: undefined,
      }, caps)
      const parts = [r.added && `${r.added} added`, r.pending && `${r.pending} fetching metadata`].filter(Boolean).join(', ')
      if (r.failed && !r.added && !r.pending) {
        setError(`qBittorrent rejected ${r.failed === 1 ? 'the torrent' : `all ${r.failed} torrents`}. They may already be in your list, or the link or file is invalid.`)
        return
      }
      notify(parts ? `Torrents ${parts}` : 'Sent to qBittorrent', { tone: 'success', ...(r.failed ? { description: `${r.failed} could not be added (duplicate or invalid).` } : {}) })
      engine.refresh()
      closeDialog()
    } catch (e) {
      setError(describeError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal size="lg" title="Add torrents" onSubmit={() => void submit()}
      footer={<>
        <span className="modal__foot-note">{total ? `${total} to add` : 'Paste links or choose .torrent files'}</span>
        <CancelButton />
        <button type="submit" className="btn btn--accent" disabled={busy || total === 0}>{busy ? 'Adding…' : start ? 'Add and start' : 'Add stopped'}</button>
      </>}
    >
      <div className={`dropzone${dragging ? ' dropzone--active' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
        <label className="field">
          <span><Icon icon={LinkIcon} size={14} /> Magnet links or URLs, one per line</span>
          <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="magnet:?xt=urn:btih:…&#10;https://example.org/file.torrent" spellCheck={false} autoFocus />
        </label>
        {unrecognised.length > 0 && <small className="field__error">Not a magnet link or URL: {unrecognised.slice(0, 2).join(', ')}{unrecognised.length > 2 ? '…' : ''}</small>}
        <div className="dropzone__files">
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}><Icon icon={AttachIcon} size={14} />Choose .torrent files</button>
          <span className="muted">or drop them here</span>
          <input ref={fileInput} type="file" accept=".torrent,application/x-bittorrent" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        </div>
        {files.length > 0 && (
          <ul className="filelist">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`}><FileIcon name={f.name} size={14} /><span>{f.name}</span>
                <button type="button" className="iconbtn iconbtn--ghost" aria-label={`Remove ${f.name}`} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))}><Icon icon={CloseIcon} size={12} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="fieldrow">
        <label className="field"><span>Save to</span>
          <input value={savepath} onChange={(e) => setSavepath(e.target.value)} placeholder={categoryPath || defaultPath || 'Default save path'} spellCheck={false} />
        </label>
        <label className="field"><span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="fieldrow">
        <label className="field"><span>Tags (comma-separated)</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} list="add-tags" placeholder={data.tags.slice(0, 3).join(', ')} />
          <datalist id="add-tags">{data.tags.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
        <label className="field"><span>Content layout</span>
          <select value={contentLayout} onChange={(e) => setContentLayout(e.target.value as AddOptions['contentLayout'])}>
            <option value="Original">Original</option>
            <option value="Subfolder">Create subfolder</option>
            <option value="NoSubfolder">Don't create subfolder</option>
          </select>
        </label>
      </div>
      <div className="checks">
        <label className="check"><input type="checkbox" checked={start} onChange={(e) => setStart(e.target.checked)} />Start torrent</label>
        <label className="check"><input type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} />Sequential download</label>
        <label className="check"><input type="checkbox" checked={firstLastPiece} onChange={(e) => setFirstLastPiece(e.target.checked)} />First &amp; last pieces first</label>
        <label className="check"><input type="checkbox" checked={skipChecking} onChange={(e) => setSkipChecking(e.target.checked)} />Skip hash check (files already complete)</label>
        {data.serverState.queueing && <label className="check"><input type="checkbox" checked={addToTop} onChange={(e) => setAddToTop(e.target.checked)} />Add to top of queue</label>}
      </div>
      {error && <p className="warn" role="alert">{error}</p>}
    </Modal>
  )
}
