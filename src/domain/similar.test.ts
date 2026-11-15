import { describe, expect, it } from 'vitest'
import { isSameSize, parseSearchHash, searchHash, searchQueryFromName } from './similar'

describe('searchQueryFromName', () => {
  it('keeps title and year, drops encode tags, extension and release group', () => {
    expect(searchQueryFromName('Open.Movie.Sintel.2010.2160p.WEB-DL.x265-GROUP.mkv')).toBe('Open Movie Sintel 2010')
    expect(searchQueryFromName('Big_Buck_Bunny_2008_1080p_BluRay_x264.mp4')).toBe('Big Buck Bunny 2008')
  })
  it('keeps episode markers', () => {
    expect(searchQueryFromName('Top.Chef.S01E07.720p.WEBRip.x264-GAZ.mkv')).toBe('Top Chef S01E07')
    expect(searchQueryFromName('Show Name - S02E10 - Title.mkv')).toBe('Show Name S02E10 Title')
  })
  it('removes bracketed tags but keeps a parenthesised year', () => {
    expect(searchQueryFromName('[SubGroup] Anime Title (2019) [1080p][HEVC].mkv')).toBe('Anime Title 2019')
    expect(searchQueryFromName('Some Album (Deluxe Edition) FLAC')).toBe('Some Album')
  })
  it('does not chop hyphenated titles', () => {
    expect(searchQueryFromName('Spider-Man.2002.1080p.BluRay.x264-GROUP')).toBe('Spider-Man 2002')
  })
  it('handles names with no tags, non-Latin text and folders', () => {
    expect(searchQueryFromName('Linux.Distro.24.04.Desktop.amd64.iso')).toBe('Linux Distro 24 04 Desktop amd64')
    expect(searchQueryFromName('برنامج توب شيف [WEB-DL][720p]')).toBe('برنامج توب شيف')
    expect(searchQueryFromName('Free.Music.Archive.Jazz.FLAC')).toBe('Free Music Archive Jazz')
  })
  it('caps the length and never returns only noise', () => {
    expect(searchQueryFromName('a b c d e f g h i j k l').split(' ')).toHaveLength(8)
    expect(searchQueryFromName('1080p.x264').length).toBeGreaterThan(0)
  })
})

describe('search hash', () => {
  it('round-trips query and size, including special characters', () => {
    const h = searchHash('Top Chef & Friends #1', 2_468_013_056)
    expect(parseSearchHash(h)).toEqual({ query: 'Top Chef & Friends #1', size: 2_468_013_056 })
  })
  it('works without a size and rejects empty or foreign hashes', () => {
    expect(parseSearchHash(searchHash('abc'))).toEqual({ query: 'abc', size: null })
    expect(parseSearchHash('#/search?q=%20')).toBeNull()
    expect(parseSearchHash('#/search')).toBeNull()
    expect(parseSearchHash('#/rss?q=x')).toBeNull()
  })
  it('ignores a bad size', () => {
    expect(parseSearchHash('#/search?q=x&size=-5')?.size).toBeNull()
    expect(parseSearchHash('#/search?q=x&size=abc')?.size).toBeNull()
  })
})

describe('isSameSize', () => {
  it('matches only exact sizes', () => {
    expect(isSameSize(100, 100)).toBe(true)
    expect(isSameSize(101, 100)).toBe(false)
    expect(isSameSize(100, null)).toBe(false)
  })
})
