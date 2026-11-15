import type { TorrentFile } from '@/api/details'

export interface FileNode {
  /** Full path inside the torrent, e.g. "Show/S01/ep1.mkv" (no trailing slash). */
  path: string
  name: string
  depth: number
  kind: 'file' | 'folder'
  size: number
  /** Bytes downloaded (progress × size, summed for folders). */
  done: number
  /** Indices of every file at or below this node. */
  indices: number[]
  /** Shared priority of all files below, or null when they differ (mixed). */
  priority: number | null
  children: FileNode[]
}

/** Builds a folder tree from qBittorrent's flat file list. Pure. Single-file torrents yield one file node. */
export function buildFileTree(files: readonly TorrentFile[]): FileNode[] {
  const root: FileNode = { path: '', name: '', depth: -1, kind: 'folder', size: 0, done: 0, indices: [], priority: null, children: [] }
  for (const f of files) {
    const parts = f.name.split('/')
    let parent = root
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join('/')
      const isFile = i === parts.length - 1
      let node = parent.children.find((c) => c.path === path)
      if (!node) {
        node = { path, name: part, depth: i, kind: isFile ? 'file' : 'folder', size: 0, done: 0, indices: [], priority: null, children: [] }
        parent.children.push(node)
      }
      node.size += f.size
      node.done += f.size * f.progress
      node.indices.push(f.index)
      node.priority = i === parts.length - 1 ? f.priority : node.indices.length === 1 ? f.priority : node.priority === f.priority ? node.priority : null
      parent = node
    })
  }
  const sort = (nodes: FileNode[]) => {
    nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.kind === 'folder' ? -1 : 1))
    nodes.forEach((n) => sort(n.children))
  }
  sort(root.children)
  return root.children
}

/** Depth-first rows to render: children of collapsed folders are hidden. */
export function visibleNodes(tree: readonly FileNode[], collapsed: ReadonlySet<string>): FileNode[] {
  const out: FileNode[] = []
  const walk = (nodes: readonly FileNode[]) => {
    for (const n of nodes) {
      out.push(n)
      if (n.kind === 'folder' && !collapsed.has(n.path)) walk(n.children)
    }
  }
  walk(tree)
  return out
}

export const nodeProgress = (n: FileNode) => (n.size > 0 ? n.done / n.size : 1)
