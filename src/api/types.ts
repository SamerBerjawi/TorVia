/** Subset of qBittorrent `sync/maindata` we consume. Unknown keys are preserved. */

export interface Torrent {
  name: string
  state: string
  progress: number
  size: number
  total_size: number
  dlspeed: number
  upspeed: number
  eta: number
  ratio: number
  num_seeds: number
  num_leechs: number
  category: string
  tags: string
  added_on: number
  [key: string]: unknown
}

export interface ServerState {
  dl_info_speed: number
  up_info_speed: number
  dl_info_data: number
  up_info_data: number
  free_space_on_disk: number
  connection_status: string
  use_alt_speed_limits: boolean
  [key: string]: unknown
}

export interface MainDataResponse {
  rid: number
  full_update?: boolean
  torrents?: Record<string, Partial<Torrent>>
  torrents_removed?: string[]
  server_state?: Partial<ServerState>
}
