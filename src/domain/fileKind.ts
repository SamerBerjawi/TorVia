/**
 * Classifies a file (or single-file torrent) by extension, the way IDEs pick icons.
 * The icon *pack* is a presentation concern (see app/FileIcon.tsx); this is the stable mapping.
 */
export type FileKind =
  | 'folder' | 'video' | 'audio' | 'image' | 'archive' | 'disc' | 'document' | 'pdf' | 'ebook'
  | 'subtitle' | 'executable' | 'code' | 'text' | 'torrent' | 'spreadsheet' | 'file'

const MAP: Record<string, FileKind> = {}
const add = (kind: FileKind, exts: string) => exts.split(' ').forEach((e) => (MAP[e] = kind))
add('video', 'mkv mp4 m4v avi mov wmv webm mpg mpeg ts m2ts flv ogv 3gp vob')
add('audio', 'mp3 flac wav aac m4a ogg opus wma alac aiff ape dsf')
add('image', 'jpg jpeg png gif webp bmp tif tiff svg heic avif raw psd')
add('archive', 'zip rar 7z tar gz tgz bz2 xz zst lz lzma cab r00 r01 001')
add('disc', 'iso img dmg bin cue nrg mdf vhd vhdx qcow2 vmdk')
add('pdf', 'pdf')
add('ebook', 'epub mobi azw azw3 fb2 cbz cbr djvu')
add('document', 'doc docx odt rtf pages ppt pptx odp key')
add('spreadsheet', 'xls xlsx ods csv numbers')
add('subtitle', 'srt ass ssa sub idx vtt sup')
add('executable', 'exe msi deb rpm apk appimage pkg run sh bat flatpak snap')
add('code', 'js ts py c cpp h rs go java json xml yml yaml html css sql')
add('text', 'txt nfo md log sfv md5 sha1 sha256 sha512 asc sig diz')
add('torrent', 'torrent')

/** Extension (lower-case, without dot) or '' when the name has none. */
export function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  const ext = base.slice(dot + 1).toLowerCase()
  return /^[a-z0-9]{1,9}$/.test(ext) ? ext : ''
}

/**
 * For torrents, a name without a known extension is treated as a folder (multi-file torrent).
 * Release names like "Some.Show.S01.1080p" have dotted parts that are not extensions; they fall to folder.
 */
export function fileKind(name: string, opts: { isDirectory?: boolean } = {}): FileKind {
  if (opts.isDirectory) return 'folder'
  const ext = extensionOf(name)
  return MAP[ext] ?? (ext && opts.isDirectory === false ? 'file' : 'folder')
}
