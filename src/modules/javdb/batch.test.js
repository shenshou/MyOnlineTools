import { describe, expect, it } from 'vitest'
import {
  filterReviewsByKeywords,
  getReviewItems,
  parseKeywords,
  uniqueReviews,
} from './batch'

describe('JavDB review helpers', () => {
  it('reads review arrays from the verified response shape', () => {
    expect(getReviewItems({ data: { data: { reviews: [{ id: 1 }] } } })).toEqual([{ id: 1 }])
  })

  it('parses unique keywords and matches case-insensitively by substring', () => {
    const keywords = parseKeywords('beautiful,剧情\nBEAUTIFUL')
    expect(keywords).toEqual(['beautiful', '剧情'])
    const reviews = [
      { id: 1, content: 'A BEAUTIFUL movie', username: 'Alice' },
      { id: 2, content: '普通评论', username: 'Bob' },
      { id: 3, content: '讨论剧情发展', username: 'Carol' },
    ]
    expect(filterReviewsByKeywords(reviews, keywords).map(item => item.id)).toEqual([1, 3])
  })

  it('deduplicates reviews returned across pages', () => {
    expect(uniqueReviews([{ id: 1 }, { id: 2 }, { id: 1 }])).toEqual([{ id: 1 }, { id: 2 }])
  })
})


describe('review date filtering', () => {
  it('keeps all dates when no cutoff is selected', async () => {
    const { filterReviews } = await import('./batch')
    const reviews = [{ id: 1, created_at: '2024-01-01T00:00:00Z' }, { id: 2, created_at: '2026-01-01T00:00:00Z' }]
    expect(filterReviews(reviews, [], '')).toEqual(reviews)
  })

  it('combines case-insensitive keyword matching with an inclusive date cutoff', async () => {
    const { filterReviews } = await import('./batch')
    const reviews = [
      { id: 1, content: 'BEAUTIFUL story', created_at: '2025-12-31T23:59:59Z' },
      { id: 2, content: 'A beautiful scene', created_at: '2026-01-01T00:00:00Z' },
      { id: 3, content: 'ordinary comment', created_at: '2026-02-01T00:00:00Z' },
      { id: 4, content: 'beautiful but date unknown' },
    ]
    expect(filterReviews(reviews, ['beautiful'], '2026-01-01').map(review => review.id)).toEqual([2])
  })
})
