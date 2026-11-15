import { useState } from 'react'
import { searchApi, type SearchPlugin } from '@/api/search'
import { notInstalled, officialUrl, validatePluginUrl, OFFICIAL_PLUGINS } from '@/domain/searchPlugins'
import { run } from '../actions/run'
import { openDialog } from '../dialogs/dialogStore'
import { Icon } from '../components/Icon'
import { DeleteIcon, RefreshIcon } from '../icons'

/**
 * Search plugins: enable/disable, update, uninstall, and install the official ones or one from a URL.
 * Plugins are Python scripts that qBittorrent downloads and RUNS on the server, so every install asks first.
 */
export function PluginManager({ plugins, onChanged, startOpen }: { plugins: readonly SearchPlugin[]; onChanged: () => void; startOpen: boolean }) {
  const [initiallyOpen] = useState(startOpen) // fixed at first render: it must not snap shut when a plugin gets enabled
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [url, setUrl] = useState('')
  const missing = notInstalled(plugins)
  const urlError = url.trim() === '' ? null : validatePluginUrl(url)
  const done = (ok: boolean) => { if (ok) onChanged() }

  const installOfficial = () => {
    const chosen = OFFICIAL_PLUGINS.filter((o) => picked.has(o.id))
    if (chosen.length === 0) return
    openDialog({
      kind: 'confirm', title: `Install ${chosen.length === 1 ? chosen[0]!.label : `${chosen.length} search plugins`}?`, confirmLabel: 'Install',
      body: `qBittorrent will download ${chosen.length === 1 ? 'this plugin' : 'these plugins'} from its official search-plugins repository on GitHub and run ${chosen.length === 1 ? 'it' : 'them'} on the machine where qBittorrent runs: ${chosen.map((c) => c.label).join(', ')}.`,
      onConfirm: async () => { done(await run(() => searchApi.installPlugins(chosen.map((c) => officialUrl(c.id))), { success: `Installed ${chosen.length === 1 ? chosen[0]!.label : `${chosen.length} plugins`}`, failure: 'Could not install the plugin(s)' })); setPicked(new Set()) },
    })
  }
  const installUrl = () => {
    if (validatePluginUrl(url) !== null) return
    const target = url.trim()
    openDialog({
      kind: 'confirm', destructive: true, title: 'Install a plugin from this address?', confirmLabel: 'Install and trust it',
      body: `${target}\n\nA search plugin is a Python program. qBittorrent will download it and run it on your server with its own permissions. Only continue if you trust whoever wrote it.`,
      onConfirm: async () => { done(await run(() => searchApi.installPlugins([target]), { success: 'Plugin installed', failure: 'Could not install the plugin' })); setUrl('') },
    })
  }

  return (
    <details className="plugins" open={initiallyOpen}>
      <summary>Search plugins <span className="muted">({plugins.filter((p) => p.enabled).length} enabled of {plugins.length})</span></summary>
      <p className="plugins__note">Search needs <strong>Python 3</strong> on the machine running qBittorrent (the LinuxServer Docker image includes it; the official qbittorrent-nox image may not) and at least one enabled plugin.</p>

      {plugins.length > 0 && (
        <table className="dtable plugins__table">
          <thead><tr><th>Plugin</th><th>Version</th><th>Enabled</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {plugins.map((p) => (
              <tr key={p.name}>
                <td>{p.fullName}</td>
                <td className="num">{p.version ?? '—'}</td>
                <td><input type="checkbox" role="switch" className="switch" aria-label={`Enable ${p.fullName}`} checked={p.enabled} onChange={(e) => void run(() => searchApi.enablePlugins([p.name], e.target.checked), { success: `${p.fullName} ${e.target.checked ? 'enabled' : 'disabled'}`, failure: 'Could not change the plugin' }).then(done)} /></td>
                <td>
                  <button type="button" className="iconbtn" aria-label={`Uninstall ${p.fullName}`} onClick={() => openDialog({ kind: 'confirm', destructive: true, title: `Uninstall ${p.fullName}?`, confirmLabel: 'Uninstall', body: 'The plugin is removed from qBittorrent. You can install it again later.', onConfirm: async () => { done(await run(() => searchApi.uninstallPlugins([p.name]), { success: `Uninstalled ${p.fullName}`, failure: 'Could not uninstall' })) } })}><Icon icon={DeleteIcon} size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {plugins.length > 0 && (
        <p><button type="button" className="btn" onClick={() => void run(() => searchApi.updatePlugins(), { success: 'Checking for plugin updates…', failure: 'Could not check for updates' }).then((ok) => ok && setTimeout(onChanged, 4000))}><Icon icon={RefreshIcon} size={14} />Update plugins</button></p>
      )}

      {missing.length > 0 && (
        <fieldset className="plugins__official">
          <legend>Add official plugins</legend>
          {missing.map((o) => (
            <label key={o.id}>
              <input type="checkbox" checked={picked.has(o.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(o.id); else n.delete(o.id); return n })} />
              <span>{o.label} <span className="muted">· {o.note}</span></span>
            </label>
          ))}
          <button type="button" className="btn btn--accent" disabled={picked.size === 0} onClick={installOfficial}>Install selected…</button>
        </fieldset>
      )}

      <form className="plugins__url" onSubmit={(e) => { e.preventDefault(); installUrl() }}>
        <label className="field"><span>Install a plugin from a web address</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.org/plugin.py" aria-invalid={urlError ? true : undefined} aria-label="Plugin address" />
        </label>
        {urlError && <small className="field__error" role="alert">{urlError}</small>}
        <button type="submit" className="btn" disabled={url.trim() === '' || urlError !== null}>Install…</button>
      </form>
    </details>
  )
}
