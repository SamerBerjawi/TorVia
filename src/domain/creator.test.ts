import { describe, expect, it } from 'vitest'
import { parseLines, pieceLabel, taskProgressPct, validateSeeds, validateSourcePath, validateTrackers } from './creator'

describe('torrent creator helpers', () => {
  it('parses one URL per line or pipe-separated, deduplicated', () => {
    expect(parseLines(' a \n\nb|a\n')).toEqual(['a', 'b'])
  })
  it('validates trackers and web seeds', () => {
    expect(validateTrackers(['udp://t:80/announce', 'https://t/a'])).toBeNull()
    expect(validateTrackers(['ftp://x'])).toBe('Not a tracker URL: ftp://x')
    expect(validateSeeds(['https://cdn/x'])).toBeNull()
    expect(validateSeeds(['udp://x'])).toMatch(/Web seeds/)
  })
  it('requires an absolute server path', () => {
    expect(validateSourcePath('')).toMatch(/Enter/)
    expect(validateSourcePath('movies/x')).toMatch(/absolute/)
    expect(validateSourcePath('/data/x')).toBeNull()
    expect(validateSourcePath('D:\\data')).toBeNull()
  })
  it('labels piece sizes', () => {
    expect([0, 16384, 1048576, 4194304].map(pieceLabel)).toEqual(['Auto', '16 KiB', '1 MiB', '4 MiB'])
  })
  it('normalises progress given as fraction or percent', () => {
    expect(taskProgressPct({ status: 'Running', progress: 0.5 })).toBe(50)
    expect(taskProgressPct({ status: 'Running', progress: 42 })).toBe(42)
    expect(taskProgressPct({ status: 'Finished' })).toBe(100)
  })
})
