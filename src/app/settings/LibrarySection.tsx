import { useState } from 'react'
import { torrentsApi } from '@/api/torrents'
import { parseTagNames, validateCategoryName, validateTagInput } from '@/domain/labels'
import { run } from '../actions/run'
import { Icon } from '../components/Icon'
import { DeleteIcon } from '../icons'
import { openDialog } from '../dialogs/dialogStore'
import { useEngine } from '../store'
import { useUi } from '../uiStore'
import { useTorrentView } from '../useTorrentView'

const count = (n: number) => `${n} ${n === 1 ? 'torrent' : 'torrents'}`

function CategoryRow({ name, savePath, torrents }: { name: string; savePath: string; torrents: number }) {
  const [path, setPath] = useState(savePath)
  const [busy, setBusy] = useState(false)
  const { category: activeCat, setCategory } = useUi()
  const dirty = path.trim() !== savePath
  return (
    <li className="label-row">
      <div className="label-row__name"><strong>{name}</strong><span className="muted">{count(torrents)}</span></div>
      <input type="text" aria-label={`Save path for ${name}`} placeholder="Default save path" value={path} onChange={(e) => setPath(e.target.value)} disabled={busy} />
      <button
        type="button" className="btn" aria-label={`Save category ${name}`} disabled={!dirty || busy}
        onClick={() => { setBusy(true); void run(() => torrentsApi.editCategory(name, path.trim()), { success: `Updated “${name}”`, failure: 'Could not update category' }).finally(() => setBusy(false)) }}
      >Save</button>
      <button
        type="button" className="iconbtn" aria-label={`Delete category ${name}`}
        onClick={() => openDialog({
          kind: 'confirm', destructive: true, title: `Delete category “${name}”?`, confirmLabel: 'Delete category',
          body: `${count(torrents)} will become uncategorised. Their files are not touched.`,
          onConfirm: async () => {
            if (await run(() => torrentsApi.removeCategories([name]), { success: `Deleted “${name}”`, failure: 'Could not delete category' }) && activeCat === name) setCategory(null)
          },
        })}
      ><Icon icon={DeleteIcon} size={16} /></button>
    </li>
  )
}

/** Create, edit and delete categories and tags. Counts come from the live sync data. */
export function LibrarySection() {
  const { data } = useEngine()
  const view = useTorrentView()
  const { tag: activeTag, setTag } = useUi()
  const [newCat, setNewCat] = useState('')
  const [newCatPath, setNewCatPath] = useState('')
  const [newTags, setNewTags] = useState('')
  const catError = newCat === '' ? null : validateCategoryName(newCat, data.categories.keys())
  const tagError = newTags === '' ? null : validateTagInput(newTags, data.tags)

  return (
    <section className="settings__section" aria-labelledby="sec-library" data-section="library">
      <h2 id="sec-library">Categories &amp; tags</h2>
      <p className="settings__note">Changes apply to qBittorrent immediately. Deleting a category or tag never deletes files.</p>

      <h3 className="settings__sub">Categories</h3>
      <ul className="label-list">
        {view.categories.length === 0 && <li className="muted">No categories yet.</li>}
        {view.categories.map((c) => <CategoryRow key={`${c}:${data.categories.get(c)?.savePath ?? ''}`} name={c} savePath={data.categories.get(c)?.savePath ?? ''} torrents={view.categoryCounts.get(c) ?? 0} />)}
      </ul>
      <form
        className="label-row label-row--new"
        onSubmit={(e) => {
          e.preventDefault()
          const name = newCat.trim()
          if (catError || name === '') return
          void run(() => torrentsApi.createCategory(name, newCatPath.trim()), { success: `Created category “${name}”`, failure: 'Could not create category' }).then((ok) => { if (ok) { setNewCat(''); setNewCatPath('') } })
        }}
      >
        <input type="text" aria-label="New category name" placeholder="New category" value={newCat} aria-invalid={catError ? true : undefined} onChange={(e) => setNewCat(e.target.value)} />
        <input type="text" aria-label="New category save path" placeholder="Save path (optional)" value={newCatPath} onChange={(e) => setNewCatPath(e.target.value)} />
        <button type="submit" className="btn btn--accent" disabled={newCat.trim() === '' || catError !== null}>Add category</button>
        {catError && <span className="setting__error" role="alert">{catError}</span>}
      </form>

      <h3 className="settings__sub">Tags</h3>
      <ul className="label-list">
        {view.tags.length === 0 && <li className="muted">No tags yet.</li>}
        {view.tags.map((t) => (
          <li key={t} className="label-row">
            <div className="label-row__name"><strong>{t}</strong><span className="muted">{count(view.tagCounts.get(t) ?? 0)}</span></div>
            <button
              type="button" className="iconbtn" aria-label={`Delete tag ${t}`}
              onClick={() => openDialog({
                kind: 'confirm', destructive: true, title: `Delete tag “${t}”?`, confirmLabel: 'Delete tag',
                body: `It will be removed from ${count(view.tagCounts.get(t) ?? 0)}. Their files are not touched.`,
                onConfirm: async () => {
                  if (await run(() => torrentsApi.deleteTags([t]), { success: `Deleted “${t}”`, failure: 'Could not delete tag' })) {
                    if (activeTag === t) setTag(null)
                  }
                },
              })}
            ><Icon icon={DeleteIcon} size={16} /></button>
          </li>
        ))}
      </ul>
      <form
        className="label-row label-row--new"
        onSubmit={(e) => {
          e.preventDefault()
          if (tagError || newTags.trim() === '') return
          const names = parseTagNames(newTags)
          void run(() => torrentsApi.createTags(names), { success: `Created ${names.length === 1 ? `tag “${names[0]}”` : `${names.length} tags`}`, failure: 'Could not create tags' }).then((ok) => { if (ok) setNewTags('') })
        }}
      >
        <input type="text" aria-label="New tags" placeholder="New tags, comma separated" value={newTags} aria-invalid={tagError ? true : undefined} onChange={(e) => setNewTags(e.target.value)} />
        <button type="submit" className="btn btn--accent" disabled={newTags.trim() === '' || tagError !== null}>Add tags</button>
        {tagError && <span className="setting__error" role="alert">{tagError}</span>}
      </form>
    </section>
  )
}
