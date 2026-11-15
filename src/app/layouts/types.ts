import type { useTorrentView } from '../useTorrentView'

export interface LayoutProps {
  view: ReturnType<typeof useTorrentView>
  narrow: boolean
  version: string | null
}
