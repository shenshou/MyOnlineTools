// Regression coverage for the JavDB Reviews API client.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSignature, getReviews, searchMovies, parseMovieId } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('JavDB API client', () => {
  it('builds the expected timestamped MD5 signature', () => {
    expect(buildSignature(1700000000)).toBe(
      '1700000000.lpw6vgqzsp.dacaffcd8b4e1b35c2752f065e906f3a',
    )
  })

  it('searches movies with the expected query and signature header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { movies: [{ id: 123 }] } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await searchMovies('ABC-123')
    const [url, options] = fetchMock.mock.calls[0]

    expect(new URL(url).pathname).toBe('/api/v2/search')
    expect(new URL(url).searchParams.get('q')).toBe('ABC-123')
    expect(new URL(url).searchParams.get('type')).toBe('movie')
    expect(new URL(url).searchParams.get('limit')).toBe('1')
    expect(options.headers.jdsignature).toMatch(/^\d+\.lpw6vgqzsp\.[a-f0-9]{32}$/)
    expect(result.data.data.movies[0].id).toBe(123)
  })

  it('treats HTTP 200 business authentication failures as errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: 0, action: 'JWTVerificationError', message: '請登錄帳號', data: null }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(searchMovies('ABF-338')).rejects.toMatchObject({
      message: '請登錄帳號',
      action: 'JWTVerificationError',
      status: 200,
    })
  })

  it('requests a selected movie review page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { reviews: [{ id: 1 }] } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getReviews(987, 2, 20)
    const [url, options] = fetchMock.mock.calls[0]

    expect(new URL(url).pathname).toBe('/api/v1/movies/987/reviews')
    expect(new URL(url).searchParams.get('page')).toBe('2')
    expect(new URL(url).searchParams.get('sort_by')).toBe('hotly')
    expect(new URL(url).searchParams.get('limit')).toBe('20')
    expect(options.credentials).toBe('omit')
  })
})


describe('JavDB movie ID parsing', () => {
  it('extracts an ID from a JavDB detail URL', () => {
    expect(parseMovieId('https://javdb.com/v/abc123?foo=bar')).toBe('abc123')
  })

  it('accepts a directly pasted movie ID', () => {
    expect(parseMovieId('abc123')).toBe('abc123')
  })

  it('rejects search URLs without a movie ID', () => {
    expect(() => parseMovieId('https://javdb.com/search?q=ABF-338')).toThrow(/没有找到影片 ID/)
  })
})
