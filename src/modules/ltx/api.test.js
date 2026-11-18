import { describe, expect, it } from 'vitest'
import { hasExactLtxCode } from './api'

describe('LTX exact code existence check', () => {
  it('matches an exact code without case sensitivity', () => {
    expect(hasExactLtxCode([{ code: 'IPX-811' }], 'ipx-811')).toBe(true)
  })

  it('normalizes equivalent Unicode hyphens and surrounding whitespace', () => {
    expect(hasExactLtxCode([{ code: 'IPX-811' }], '  ipx－811  ')).toBe(true)
    expect(hasExactLtxCode([{ code: 'IPX-811' }], 'IPX–811')).toBe(true)
  })

  it('does not treat a partial or fuzzy result as an exact match', () => {
    expect(hasExactLtxCode([{ code: 'IPX-8110' }], 'IPX-811')).toBe(false)
    expect(hasExactLtxCode([{ code: 'IPX-812' }], 'IPX-811')).toBe(false)
  })

  it('returns false for empty targets or invalid result collections', () => {
    expect(hasExactLtxCode([{ code: 'IPX-811' }], '')).toBe(false)
    expect(hasExactLtxCode(null, 'IPX-811')).toBe(false)
    expect(hasExactLtxCode([], 'IPX-811')).toBe(false)
  })

  it('ignores records without a string code', () => {
    expect(hasExactLtxCode([{}, { code: null }, { code: 'IPX-812' }], 'IPX-811')).toBe(false)
  })
})
