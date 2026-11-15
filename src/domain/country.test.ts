import { describe, expect, it } from 'vitest'
import { countriesUnavailable, countryCode, peerCountry } from './country'

describe('countryCode', () => {
  it('accepts two letters in any case and lower-cases them', () => {
    expect(countryCode('be')).toBe('be')
    expect(countryCode('US')).toBe('us')
  })
  it('rejects anything that could change an image path', () => {
    for (const bad of ['', 'b', 'bel', '../', 'b/', 'b.', '1a', 'é', null, undefined, 5, {}]) expect(countryCode(bad)).toBeNull()
  })
})

describe('peerCountry', () => {
  it('uses the reported name, falling back to the code', () => {
    expect(peerCountry({ country_code: 'be', country: 'Belgium' })).toEqual({ code: 'be', name: 'Belgium' })
    expect(peerCountry({ country_code: 'nl', country: '  ' })).toEqual({ code: 'nl', name: 'NL' })
  })
  it('is null without a valid code', () => {
    expect(peerCountry({ country_code: '', country: '' })).toBeNull()
    expect(peerCountry({})).toBeNull()
  })
})

describe('countriesUnavailable', () => {
  it('flags peers that all lack a country, but not an empty list or a mix', () => {
    expect(countriesUnavailable([{ country_code: '' }, {}])).toBe(true)
    expect(countriesUnavailable([])).toBe(false)
    expect(countriesUnavailable([{ country_code: '' }, { country_code: 'be' }])).toBe(false)
  })
})
