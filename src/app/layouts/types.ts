import type { ReactNode } from 'react'
import type { Route } from '../router'
import type { useTorrentView } from '../useTorrentView'

export interface LayoutProps {
  view: ReturnType<typeof useTorrentView>
  narrow: boolean
  version: string | null
  route: Route
  /** Rendered Statistics view when route is 'statistics', else null. */
  statistics: ReactNode
}
