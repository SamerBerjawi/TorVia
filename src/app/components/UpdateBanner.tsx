import { dismissUpdate, CURRENT_VERSION, pendingUpdate, useUpdates } from '../updates'
import { Icon } from './Icon'
import { CloseIcon, NotificationIcon } from '../icons'

/** "Torvia x.y.z is available": shown once per new version until dismissed. */
export function UpdateBanner() {
  const update = pendingUpdate(useUpdates())
  if (!update) return null
  return (
    <div className="banner banner--update" role="status">
      <Icon icon={NotificationIcon} size={14} />
      <span>Torvia {update.version} is available (you have {CURRENT_VERSION}).</span>
      <a href={update.url} target="_blank" rel="noopener noreferrer">What’s new and how to update</a>
      <span className="banner__spacer" />
      <button type="button" className="iconbtn iconbtn--sm" aria-label="Dismiss update notice" onClick={() => dismissUpdate(update.version)}><Icon icon={CloseIcon} size={14} /></button>
    </div>
  )
}
