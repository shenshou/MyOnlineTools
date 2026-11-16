import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildSignature, getReviews, searchMovies } from './api'

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
    expect(options.headers.jdSignature).toMatch(/^\d+\.lpw6vgqzsp\.[a-f0-9]{32}$/)
    expect(result.data.data.movies[0].id).toBe(123)
  })

  it('requests a selected movie review page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { reviews: [{ id: 1 }] } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await getReviews(987, 2, 20)
    const [url] = fetchMock.mock.calls[0]

    expect(new URL(url).pathname).toBe('/api/v1/movies/987/reviews')
    expect(new URL(url).searchParams.get('page')).toBe('2')
    expect(new URL(url).searchParams.get('sort_by')).toBe('hotly')
    expect(new URL(url).searchParams.get('limit')).toBe('20')
  })
})
