import type { ReactNode } from 'react'
import type { ActionContext } from '../actions/catalogue'
import type { Route } from '../router'
import type { useTorrentView } from '../useTorrentView'

export interface LayoutProps {
  view: ReturnType<typeof useTorrentView>
  narrow: boolean
  version: string | null
  route: Route
  /** Rendered full-page view (statistics, settings) instead of the torrent list, else null. */
  page: ReactNode
  /** Actions for the current selection. */
  ctx: ActionContext
}
