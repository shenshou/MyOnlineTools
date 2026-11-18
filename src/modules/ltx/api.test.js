import { describe, expect, it } from 'vitest'
import { findExactLtxCodeInPages, hasExactLtxCode } from './api'

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


describe('LTX exact code pagination', () => {
  it('returns true when the exact code appears on a later page', async () => {
    const fetchPage = async offset => ({
      items: [{ code: 'IPX-811' }],
      total: 61,
      offset,
      snapshot: 'snapshot-1',
    })

    await expect(findExactLtxCodeInPages({
      items: Array.from({ length: 60 }, (_, index) => ({ code: `OTHER-${index}` })),
      total: 61,
      offset: 0,
      snapshot: 'snapshot-1',
    }, fetchPage, 'IPX-811')).resolves.toBe(true)
  })

  it('returns false only after every result page has been checked', async () => {
    const firstPage = {
      items: Array.from({ length: 60 }, (_, index) => ({ code: `OTHER-${index}` })),
      total: 61,
      offset: 0,
      snapshot: 'snapshot-1',
    }
    const fetchPage = async offset => ({
      items: [{ code: 'OTHER-60' }],
      total: 61,
      offset,
      snapshot: 'snapshot-1',
    })

    await expect(findExactLtxCodeInPages(firstPage, fetchPage, 'IPX-811')).resolves.toBe(false)
  })

  it('does not return false when pagination ends before the reported total', async () => {
    const firstPage = {
      items: [{ code: 'OTHER-1' }],
      total: 3,
      offset: 0,
      snapshot: 'snapshot-1',
    }

    await expect(findExactLtxCodeInPages(firstPage, async () => ({
      items: [],
      total: 3,
      offset: 1,
      snapshot: 'snapshot-1',
    }), 'IPX-811')).rejects.toThrow('分页提前结束')
  })

  it('rejects inconsistent snapshots rather than producing a false negative', async () => {
    const firstPage = {
      items: [{ code: 'OTHER-1' }],
      total: 2,
      offset: 0,
      snapshot: 'snapshot-1',
    }

    await expect(findExactLtxCodeInPages(firstPage, async offset => ({
      items: [{ code: 'OTHER-2' }],
      total: 2,
      offset,
      snapshot: 'snapshot-2',
    }), 'IPX-811')).rejects.toThrow('版本发生变化')
  })

  it('rejects incomplete pagination metadata', async () => {
    await expect(findExactLtxCodeInPages({
      items: [{ code: 'OTHER-1' }],
      offset: 0,
      snapshot: 'snapshot-1',
    }, async () => null, 'IPX-811')).rejects.toThrow('total')
  })
})
