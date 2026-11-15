// Builds sample content for README screenshots: sparse files (no disk used) plus REAL .torrent files
// whose piece hashes match them, so qBittorrent genuinely verifies them and reports real states.
// Nothing in the app is mocked: these are ordinary torrents in a throwaway qBittorrent.
//   node scripts/screenshots/make-sample-data.mjs <out-dir>
// Writes <out-dir>/downloads/** (sparse), <out-dir>/torrents/*.torrent and <out-dir>/manifest.json
import { createHash } from 'node:crypto'
import { chmodSync, closeSync, ftruncateSync, mkdirSync, openSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const MiB = 1024 * 1024, GiB = 1024 * MiB, PIECE = 4 * MiB

/**
 * `filled` (0..1): only that fraction of the torrent is "present". The hashes are computed over data that
 * differs beyond that point, so qBittorrent verifies exactly that fraction as complete.
 */
export const SAMPLES = [
  { name: 'Linux.Distro.24.04.Desktop.amd64.iso', category: 'Linux ISOs', tags: ['open-source'], files: [{ path: 'Linux.Distro.24.04.Desktop.amd64.iso', size: 5.8 * GiB }] },
  { name: 'Distro.Workstation.Live.42.x86_64.iso', category: 'Linux ISOs', tags: ['open-source'], filled: 0.62, stopped: true, files: [{ path: 'Distro.Workstation.Live.42.x86_64.iso', size: 2.3 * GiB }] },
  { name: 'Rolling.Release.2026.11.01.x86_64.iso', category: 'Linux ISOs', tags: ['open-source', 'archive'], filled: 0.87, stopped: true, files: [{ path: 'Rolling.Release.2026.11.01.x86_64.iso', size: 1.4 * GiB }] },
  { name: 'Open.Movie.Sintel.2010.2160p.mkv', category: 'Movies', tags: ['4k', 'open-source'], files: [{ path: 'Open.Movie.Sintel.2010.2160p.mkv', size: 4.2 * GiB }] },
  { name: 'Open.Movie.Big.Buck.Bunny.2008.1080p.mkv', category: 'Movies', tags: ['open-source'], files: [{ path: 'Open.Movie.Big.Buck.Bunny.2008.1080p.mkv', size: 1.1 * GiB }] },
  {
    name: 'Open.Movie.Shorts.S01.1080p', category: 'Movies', tags: ['open-source'],
    files: [1, 2, 3, 4, 5, 6].flatMap((n) => [
      { path: `Open.Movie.Shorts.S01E0${n}.1080p.mkv`, size: 612 * MiB + n * 3 * MiB },
      { path: `Subs/Open.Movie.Shorts.S01E0${n}.en.srt`, size: 96 * 1024 },
    ]).concat([{ path: 'Open.Movie.Shorts.S01.nfo', size: 4096 }]),
  },
  {
    name: 'Free.Music.Archive.Jazz.FLAC', category: 'Music', tags: ['archive'],
    files: Array.from({ length: 12 }, (_, i) => ({ path: `${String(i + 1).padStart(2, '0')} - Track ${i + 1}.flac`, size: 28 * MiB + i * MiB })).concat([{ path: 'cover.jpg', size: 612 * 1024 }, { path: 'checksums.sha256', size: 2048 }]),
  },
  { name: 'Public.Domain.Books.Collection.epub.zip', category: 'Books', tags: ['archive'], files: [{ path: 'Public.Domain.Books.Collection.epub.zip', size: 3.4 * GiB }], missing: true },
  { name: 'Offline.Encyclopedia.2026-10.zim', category: 'Linux ISOs', tags: ['archive'], files: [{ path: 'Offline.Encyclopedia.2026-10.zim', size: 9.6 * GiB }] },
]

const bstr = (s) => { const b = Buffer.isBuffer(s) ? s : Buffer.from(s); return Buffer.concat([Buffer.from(`${b.length}:`), b]) }
const bint = (n) => Buffer.from(`i${Math.round(n)}e`)
const blist = (items) => Buffer.concat([Buffer.from('l'), ...items, Buffer.from('e')])
const bdict = (entries) => Buffer.concat([Buffer.from('d'), ...Object.keys(entries).sort().flatMap((k) => [bstr(k), entries[k]]), Buffer.from('e')])

function build(spec, downloads) {
  const files = spec.files.map((f) => ({ ...f, size: Math.round(f.size) }))
  const total = files.reduce((a, f) => a + f.size, 0)
  // Complete torrents are present in full; partial ones are cut on a MiB boundary so the cut is exact.
  const present = spec.filled === undefined ? total : Math.floor((total * spec.filled) / MiB) * MiB
  const zero = Buffer.alloc(MiB), one = Buffer.alloc(MiB, 1)
  const pieces = []
  let h = createHash('sha1'), inPiece = 0, pos = 0
  for (const f of files) {
    for (let done = 0; done < f.size; ) {
      const n = Math.min(MiB, f.size - done, PIECE - inPiece)
      h.update((pos + n <= present ? zero : one).subarray(0, n))
      done += n; pos += n; inPiece += n
      if (inPiece === PIECE) { pieces.push(h.digest()); h = createHash('sha1'); inPiece = 0 }
    }
  }
  if (inPiece > 0) pieces.push(h.digest())

  if (!spec.missing) {
    for (const f of files) {
      const path = files.length > 1 ? join(downloads, spec.name, f.path) : join(downloads, f.path)
      mkdirSync(dirname(path), { recursive: true, mode: 0o777 })
      const fd = openSync(path, 'w'); ftruncateSync(fd, f.size); closeSync(fd); chmodSync(path, 0o666)
    }
    if (files.length > 1) chmodSync(join(downloads, spec.name), 0o777)
  }
  const info = { name: bstr(spec.name), 'piece length': bint(PIECE), pieces: bstr(Buffer.concat(pieces)) }
  if (files.length === 1) info.length = bint(files[0].size)
  else info.files = blist(files.map((f) => bdict({ length: bint(f.size), path: blist(f.path.split('/').map(bstr)) })))
  const torrent = bdict({
    announce: bstr('udp://tracker.example.org:6969/announce'),
    comment: bstr('Sample torrent for Torvia screenshots'),
    'created by': bstr('torvia/scripts/screenshots'),
    'creation date': bint(1_762_000_000),
    info: bdict(info),
  })
  return { torrent, total, present }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2]
  if (!out) throw new Error('Usage: node make-sample-data.mjs <out-dir>')
  const downloads = join(out, 'downloads'), torrents = join(out, 'torrents')
  mkdirSync(downloads, { recursive: true, mode: 0o777 }); chmodSync(downloads, 0o777); mkdirSync(torrents, { recursive: true })
  const manifest = []
  for (const s of SAMPLES) {
    const { torrent, total, present } = build(s, downloads)
    const file = `${s.name}.torrent`
    writeFileSync(join(torrents, file), torrent)
    manifest.push({ file, name: s.name, category: s.category, tags: s.tags, stopped: Boolean(s.stopped), missing: Boolean(s.missing), total, present })
  }
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`${manifest.length} sample torrents in ${out}`)
}
