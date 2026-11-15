import { ApiError, getJson, post, postOrThrow } from './transport'

export type CreatorFormat = 'v1' | 'v2' | 'hybrid'
export interface CreatorTask {
  taskID: string
  sourcePath: string
  status: 'Queued' | 'Running' | 'Failed' | 'Finished'
  progress?: number
  errorMessage?: string
  torrentFilePath?: string
  timeAdded?: number
}
export interface CreatorParams {
  sourcePath: string
  private: boolean
  format: CreatorFormat
  pieceSize: number
  comment: string
  source: string
  trackers: readonly string[]
  urlSeeds: readonly string[]
  startSeeding: boolean
  optimizeAlignment: boolean
  ignoreDotfiles: boolean
}

export const creatorApi = {
  status: (signal?: AbortSignal) => getJson<CreatorTask[]>('torrentcreator/status', signal),
  async add(p: CreatorParams): Promise<string> {
    const form: Record<string, string> = {
      sourcePath: p.sourcePath, private: String(p.private), format: p.format, pieceSize: String(p.pieceSize),
      comment: p.comment, source: p.source, trackers: p.trackers.join('|'), urlSeeds: p.urlSeeds.join('|'),
      startSeeding: String(p.startSeeding), optimizeAlignment: String(p.optimizeAlignment), ignoreDotfiles: String(p.ignoreDotfiles),
    }
    const r = await post('torrentcreator/addTask', form)
    if (!r.ok) throw new ApiError('bad-request', r.status, (await r.text()).trim() || 'Could not create the task')
    return ((await r.json()) as { taskID: string }).taskID
  },
  remove: (taskID: string) => postOrThrow('torrentcreator/deleteTask', { taskID }),
  /** Same-origin link; the browser sends the session cookie. */
  fileUrl: (taskID: string) => `api/v2/torrentcreator/torrentFile?taskID=${encodeURIComponent(taskID)}`,
}
