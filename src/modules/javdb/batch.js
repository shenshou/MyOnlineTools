export function getReviewItems(result) {
  const candidates = [
    result?.data?.data?.reviews,
    result?.data?.reviews,
    result?.data?.data?.data?.reviews,
  ]
  return candidates.find(Array.isArray) || []
}

export function parseKeywords(input) {
  return [...new Set(
    String(input || '')
      .split(/[\r\n,，;；]+/)
      .map(value => value.trim().toLocaleLowerCase())
      .filter(Boolean),
  )]
}

export function filterReviewsByKeywords(reviews, keywords) {
  if (!keywords?.length) return reviews
  return reviews.filter(review => {
    const searchable = [review?.content, review?.username]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
    return keywords.some(keyword => searchable.includes(keyword))
  })
}

export function uniqueReviews(reviews) {
  const seen = new Set()
  return reviews.filter(review => {
    const key = review?.id != null
      ? String(review.id)
      : `${review?.username || ''}| ${review?.created_at || ''}| ${review?.content || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getReviewTimestamp(review) {
  const value = review?.created_at ?? review?.createdAt ?? review?.created
  if (value == null || value === '') return null
  const numeric = typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value))
  const timestamp = numeric
    ? Number(value) * (Number(value) < 1e12 ? 1000 : 1)
    : Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

export function filterReviews(reviews, keywords = [], sinceDate = '') {
  const keywordFiltered = filterReviewsByKeywords(reviews, keywords)
  if (!sinceDate) return keywordFiltered

  const cutoff = new Date(`${sinceDate}T00:00:00`).getTime()
  if (!Number.isFinite(cutoff)) return keywordFiltered

  return keywordFiltered.filter(review => {
    const timestamp = getReviewTimestamp(review)
    return timestamp != null && timestamp >= cutoff
  })
}
