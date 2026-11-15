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
  num_complete: number
  num_leechs: number
  num_incomplete: number
  category: string
  /** Comma-separated, e.g. "4k, archive". */
  tags: string
  added_on: number
  completion_on: number
  amount_left: number
  downloaded: number
  uploaded: number
  save_path: string
  [key: string]: unknown
}

export interface Category {
  name: string
  savePath: string
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
  dht_nodes: number
  [key: string]: unknown
}

export interface MainDataResponse {
  rid: number
  full_update?: boolean
  torrents?: Record<string, Partial<Torrent>>
  torrents_removed?: string[]
  categories?: Record<string, Partial<Category>>
  categories_removed?: string[]
  tags?: string[]
  tags_removed?: string[]
  server_state?: Partial<ServerState>
}
