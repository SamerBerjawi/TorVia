import { SearchIcon } from '../icons'
import { useUi } from '../uiStore'
import { Icon } from './Icon'

/** Plain filter input (Graphite, Paper). Accepts the same query language as Signal's bar. */
export function SearchBox({ placeholder, hint }: { placeholder: string; hint?: string }) {
  const { query, setQuery } = useUi()
  return (
    <label className="search">
      <Icon icon={SearchIcon} size={15} />
      <span className="sr-only">Filter torrents</span>
      <input data-search type="search" value={query} placeholder={placeholder} onChange={(e) => setQuery(e.target.value)} />
      {hint && <kbd className="kbd">{hint}</kbd>}
    </label>
  )
}
