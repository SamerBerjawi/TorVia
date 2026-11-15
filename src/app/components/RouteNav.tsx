import { hrefFor, type Route } from '../router'
import { SettingsIcon, StatisticsIcon, TorrentsIcon } from '../icons'
import { Icon } from './Icon'

const ITEMS: { route: Route; label: string; icon: typeof TorrentsIcon }[] = [
  { route: 'torrents', label: 'Torrents', icon: TorrentsIcon },
  { route: 'statistics', label: 'Statistics', icon: StatisticsIcon },
  { route: 'settings', label: 'Settings', icon: SettingsIcon },
]

/** Top-level destinations. `variant` only changes styling per skin. */
export function RouteNav({ route, variant }: { route: Route; variant: 'list' | 'tabs' | 'text' }) {
  return (
    <nav className={`routenav routenav--${variant}`} aria-label="Sections">
      {ITEMS.map((i) => (
        <a key={i.route} href={hrefFor(i.route)} aria-current={route === i.route ? 'page' : undefined}>
          {variant !== 'text' && <Icon icon={i.icon} size={16} />}
          {variant === 'text' ? i.label.toLowerCase() : i.label}
        </a>
      ))}
    </nav>
  )
}
