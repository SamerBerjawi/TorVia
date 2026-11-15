import { fileKind } from '@/domain/fileKind'
import { FILE_ICONS } from '../fileIcons.generated'

/**
 * IDE-style file-type icon (Material Icon Theme, MIT). The SVG bodies are generated at build time
 * from a pinned package by scripts/gen-file-icons.mjs — trusted static markup, never user input.
 */
export function FileIcon({ name, isDirectory, size = 16 }: { name: string; isDirectory?: boolean; size?: number }) {
  const kind = fileKind(name, isDirectory === undefined ? {} : { isDirectory })
  const icon = FILE_ICONS[kind]
  return (
    <svg
      className="file-icon"
      data-kind={kind}
      width={size}
      height={size}
      viewBox={`0 0 ${icon.w} ${icon.h}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  )
}
