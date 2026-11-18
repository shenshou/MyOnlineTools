const CANDIDATE_PATTERN = /(?<![A-Z0-9_-])(?=[A-Z0-9_-]*[A-Z])([A-Z0-9]{2,12}(?:[-_][A-Z0-9]{2,12}){0,2})[-_]([0-9]{2,7}(?:[-_][0-9]{1,5})?)(?![A-Z0-9_-])/gi

// Common descriptive labels that should not be interpreted as studio prefixes.
const NON_CODE_PREFIXES = new Set([
  'VERSION', 'VER', 'CHAPTER', 'CH', 'MODEL', 'PART', 'EPISODE', 'EP', 'SEASON',
  'DISC', 'VOL', 'VOLUME', 'PAGE', 'SCENE', 'TRACK', 'CD', 'DVD', 'BLU', 'YEAR',
  'MONTH', 'DAY', 'DATE', 'NO', 'NUMBER',
])
const ORDINAL_PREFIX = /^\d+(?:ST|ND|RD|TH)$/i

function isPlausiblePrefix(prefix) {
  const segments = prefix.split(/[-_]/)
  if (segments.some(segment => ORDINAL_PREFIX.test(segment))) return false
  if (segments.some(segment => NON_CODE_PREFIXES.has(segment))) return false
  return segments.some(segment => /[A-Z]/i.test(segment))
}

/**
 * Extract syntactically plausible JAV identifiers from free text.
 * Unknown prefixes are allowed; this is not a studio whitelist.
 * Without a complete canonical catalogue, syntax-based extraction cannot guarantee
 * that every candidate is a real identifier.
 */
export function extractJavCodes(input) {
  const text = String(input ?? '').toUpperCase()
  const matches = []
  for (const match of text.matchAll(CANDIDATE_PATTERN)) {
    const [, rawPrefix, rawNumber] = match
    if (!isPlausiblePrefix(rawPrefix)) continue
    matches.push(`${rawPrefix}-${rawNumber}`.replace(/_/g, '-'))
  }
  return matches.join(' ')
}
