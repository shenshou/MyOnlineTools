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
  return reviews.filter((review, index) => {
    const key = review?.id != null
      ? String(review.id)
      : `${review?.username || ''}| ${review?.created_at || ''}| ${review?.content || ''}|${index}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
