import { describe, expect, it } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  isExactMovieCode,
  normalizeMovieCode,
  parseJavDbSearchResults,
  parseMovieNumbers,
} from './search'

describe('JavDB search parsing', () => {
  it('normalizes and deduplicates a batch of movie numbers', () => {
    expect(parseMovieNumbers('ABF-338, abf338\nSSIS-123；IPX_456')).toEqual([
      'ABF-338',
      'SSIS-123',
      'IPX_456',
    ])
    expect(normalizeMovieCode('ABF-338')).toBe('ABF338')
  })

  it('matches a complete number at the beginning of a title', () => {
    expect(isExactMovieCode('ABF-338 空っぽになるまで', 'ABF-338')).toBe(true)
    expect(isExactMovieCode('ABF-338A another edition', 'ABF-338')).toBe(false)
    expect(isExactMovieCode('ABF-378 title', 'ABF-338')).toBe(false)
  })

  it('extracts title, detail URL and movie ID from JavDB search HTML', () => {
    const html = `
      <div class="movie-list">
        <div class="item">
          <a href="/v/82Z8AE"><div class="video-title">ABF-338 Example title</div></a>
        </div>
        <div class="item"><a href="/v/P9mOMe">ABF-378 Other title</a></div>
      </div>`
    const { window } = new JSDOM('')
    const results = parseJavDbSearchResults(html, window.DOMParser)

    expect(results).toEqual([
      { title: 'ABF-338 Example title', url: 'https://javdb.com/v/82Z8AE', movieId: '82Z8AE' },
      { title: 'ABF-378 Other title', url: 'https://javdb.com/v/P9mOMe', movieId: 'P9mOMe' },
    ])
    window.close()
  })
})
