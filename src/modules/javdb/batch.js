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
    const searchable = String(review?.content || '').toLocaleLowerCase()
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


export function splitTextByKeywords(value, keywords = []) {
  const text = String(value || '')
  const terms = [...new Set((keywords || []).map(term => String(term || '').trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
  if (!text || !terms.length) return [{ text, matched: false }]

  const escapeRegex = term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\export function splitTextByKeywords(value, keywords = []) {
  const text = String(value || '')
  const terms = [...new Set((keywords || []).map(term => String(term || '').trim()).filter(Boolean))]
    .sort((a, b) => b.length - a.length)
  if (!text || !terms.length) return [{ text, matched: false }]
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(${terms.map(escapeRegex).join('|')})`, 'gi')
  return text.split(pattern).filter(part => part !== '').map((part, index) => ({ text: part, matched: index % 2 === 1 }))
}')
  const pattern = new RegExp(terms.map(escapeRegex).join('|'), 'gi')
  const parts = []
  let cursor = 0
  let match

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push({ text: text.slice(cursor, match.index), matched: false })
    }
    parts.push({ text: match[0], matched: true })
    cursor = match.index + match[0].length
  }

  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), matched: false })
  }
  return parts.length ? parts : [{ text, matched: false }]
}
