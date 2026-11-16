import { describe, expect, it } from 'vitest'
import {
  filterReviewsByKeywords,
  getReviewItems,
  parseKeywords,
  uniqueReviews,
} from './batch'

describe('JavDB review helpers', () => {
  it('reads review arrays from the verified response shape', () => {
    expect(getReviewItems({ data: { data: { reviews: [{ id: 1 }] } })).toEqual([{ id: 1 }])
  })

  it('parses unique keywords and matches case-insensitively by substring', () => {
    const keywords = parseKeywords('beautiful,剧情\\nBEAUTIFUL')
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
