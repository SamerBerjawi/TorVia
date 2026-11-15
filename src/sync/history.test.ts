import { describe, expect, it } from 'vitest'
import { emptyHistory, pushSample } from './history'

describe('pushSample', () => {
  it('appends and caps length', () => {
    let h = emptyHistory
    for (let i = 0; i < 5; i++) h = pushSample(h, i, i * 10, 3)
    expect(h.dl).toEqual([2, 3, 4])
    expect(h.up).toEqual([20, 30, 40])
  })
})
