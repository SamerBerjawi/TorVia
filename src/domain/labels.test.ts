import { describe, expect, it } from 'vitest'
import { parseTagNames, validateCategoryName, validateTagInput } from './labels'

describe('labels', () => {
  it('validates category names', () => {
    expect(validateCategoryName('  ', [])).toBe('Enter a name')
    expect(validateCategoryName('/tv', [])).not.toBeNull()
    expect(validateCategoryName('tv//hd', [])).not.toBeNull()
    expect(validateCategoryName('tv/hd', [])).toBeNull()
    expect(validateCategoryName('Movies', ['movies'])).toBe('That category already exists')
  })
  it('parses tags: trims, dedupes, splits on commas and newlines', () => {
    expect(parseTagNames(' a, b\nc,a ,, ')).toEqual(['a', 'b', 'c'])
  })
  it('rejects empty and existing tags', () => {
    expect(validateTagInput(' , ', [])).toBe('Enter at least one tag')
    expect(validateTagInput('x, Linux', ['linux'])).toBe('Already exists: Linux')
    expect(validateTagInput('x', ['linux'])).toBeNull()
  })
})
