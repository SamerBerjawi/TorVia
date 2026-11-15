/**
 * Classifies a file (or a torrent's name) the way IDEs pick file icons.
 * Which picture each kind gets is a presentation concern (app/components/FileIcon.tsx).
 */
export const FILE_KINDS = [
  'folder', 'folder-video', 'folder-audio', 'folder-images', 'folder-archive',
  'video', 'audio', 'image', 'vector', 'archive', 'disc', 'cue', 'vm', 'installer', 'library', 'android', 'package',
  'pdf', 'ebook', 'document', 'spreadsheet', 'slides', 'subtitle', 'font', 'json', 'xml', 'yaml', 'html', 'markdown',
  'log', 'shell', 'powershell', 'python', 'javascript', 'code', 'text', 'readme', 'license', 'checksum', 'signature',
  'certificate', 'database', 'model3d', 'torrent', 'file',
] as const
export type FileKind = (typeof FILE_KINDS)[number]

const MAP: Record<string, FileKind> = {}
const add = (kind: FileKind, exts: string) => exts.split(' ').forEach((e) => (MAP[e] = kind))
add('video', 'mkv mp4 m4v avi mov wmv webm mpg mpeg ts m2ts mts flv ogv 3gp vob divx rmvb')
add('audio', 'mp3 flac wav aac m4a m4b ogg opus wma alac aiff ape dsf dff wv mka')
add('image', 'jpg jpeg png gif webp bmp tif tiff heic heif avif raw cr2 nef arw dng psd ico')
add('vector', 'svg eps ai')
add('archive', 'zip rar 7z tar gz tgz bz2 xz zst lz lzma cab r00 r01 001 z01')
add('disc', 'iso img bin nrg mdf mds dmg')
add('cue', 'cue')
add('vm', 'vmdk vdi vhd vhdx qcow2 ova ovf')
add('installer', 'exe msi bat cmd com')
add('library', 'dll so dylib sys')
add('android', 'apk xapk apks aab')
add('package', 'deb rpm appimage flatpak flatpakref snap pkg pacman zst')
add('pdf', 'pdf')
add('ebook', 'epub mobi azw azw3 fb2 cbz cbr cb7 djvu')
add('document', 'doc docx odt rtf pages')
add('spreadsheet', 'xls xlsx ods csv tsv numbers')
add('slides', 'ppt pptx odp key')
add('subtitle', 'srt ass ssa sub idx vtt sup')
add('font', 'ttf otf woff woff2')
add('json', 'json jsonl')
add('xml', 'xml')
add('yaml', 'yml yaml toml')
add('html', 'html htm')
add('markdown', 'md markdown')
add('log', 'log')
add('shell', 'sh bash zsh run')
add('powershell', 'ps1')
add('python', 'py')
add('javascript', 'js mjs cjs')
add('code', 'c cpp h hpp rs go java kt cs rb php lua sql ts')
add('text', 'txt nfo diz')
add('checksum', 'md5 sfv sha1 sha256 sha512 par2 par')
add('signature', 'asc sig gpg pgp')
add('certificate', 'pem crt cer')
add('database', 'db sqlite sqlite3 zim mdb')
add('model3d', 'obj stl fbx blend glb gltf 3ds')
add('torrent', 'torrent')
MAP['zst'] = 'archive'

/** Extension (lower-case, without dot) or '' when the name has none. */
export function extensionOf(name: string): string {
  const base = name.slice(name.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  if (dot <= 0 || dot === base.length - 1) return ''
  const ext = base.slice(dot + 1).toLowerCase()
  return /^[a-z0-9]{1,9}$/.test(ext) ? ext : ''
}

const VIDEO_HINT = /\b(2160p|1080p|720p|480p|4k|uhd|x26[45]|h\.?26[45]|hevc|av1|bluray|blu-ray|bdrip|brrip|web-?dl|webrip|hdtv|dvdrip|remux|s\d{1,2}e\d{1,3}|s\d{1,2}|season)\b/i
const AUDIO_HINT = /\b(flac|mp3|320kbps|v0|aac|alac|24bit|16bit|discography|album|ost|soundtrack|vinyl)\b/i
const IMAGE_HINT = /\b(wallpapers?|photos?|images|pictures|artbook)\b/i

/** Picks a folder icon from release-name conventions (multi-file torrents have no extension). */
export function folderKind(name: string): FileKind {
  const n = name.replace(/[._]/g, ' ')
  if (VIDEO_HINT.test(n)) return 'folder-video'
  if (AUDIO_HINT.test(n)) return 'folder-audio'
  if (IMAGE_HINT.test(n)) return 'folder-images'
  return 'folder'
}

/**
 * A name without a known extension is treated as a folder (multi-file torrent) unless the caller
 * knows it is a file (`isDirectory: false`), e.g. inside a torrent's file list.
 */
export function fileKind(name: string, opts: { isDirectory?: boolean } = {}): FileKind {
  if (opts.isDirectory) return folderKind(name)
  const base = name.slice(name.lastIndexOf('/') + 1).toLowerCase()
  if (opts.isDirectory === false && /^readme(\.|$)/.test(base)) return 'readme'
  if (opts.isDirectory === false && /^(license|licence|copying)(\.|$)/.test(base)) return 'license'
  const known = MAP[extensionOf(name)]
  if (known) return known
  return opts.isDirectory === false ? 'file' : folderKind(name)
}
