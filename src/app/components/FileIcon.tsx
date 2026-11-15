import type { IconSvgElement } from '@hugeicons/react'
import { fileKind, type FileKind } from '@/domain/fileKind'
import * as I from '../icons'
import { Icon } from './Icon'

/**
 * IDE-style file-type icon. Current pack: Hugeicons stroke glyphs tinted per kind.
 * A colour pack (Material Icon Theme, Catppuccin, …) plugs in here without touching callers.
 */
const ICONS: Record<FileKind, IconSvgElement> = {
  folder: I.FolderIcon, video: I.VideoIcon, audio: I.AudioIcon, image: I.ImageIcon, archive: I.ArchiveIcon,
  disc: I.DiscIcon, document: I.DocumentIcon, pdf: I.PdfIcon, ebook: I.EbookIcon, subtitle: I.SubtitleIcon,
  executable: I.ExecutableIcon, code: I.CodeIcon, text: I.TextIcon, torrent: I.TorrentFileIcon,
  spreadsheet: I.SpreadsheetIcon, file: I.FileIcon,
}

export function FileIcon({ name, isDirectory, size = 16 }: { name: string; isDirectory?: boolean; size?: number }) {
  const kind = fileKind(name, isDirectory === undefined ? {} : { isDirectory })
  return (
    <span className="file-icon" data-kind={kind} title={kind}>
      <Icon icon={ICONS[kind]} size={size} />
    </span>
  )
}
