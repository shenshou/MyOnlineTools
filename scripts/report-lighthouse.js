import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const reportPath = resolve(process.argv[2] || 'artifacts/lighthouse-performance.json')
const historyPath = resolve(process.argv[3] || 'data/lighthouse-history.json')
if (!existsSync(reportPath)) throw new Error(`Lighthouse report not found: ${reportPath}`)

const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const performanceScore = report.categories?.performance?.score
if (typeof performanceScore !== 'number') {
  throw new Error('Lighthouse report does not contain a performance score')
}

function metric(id, digits = 0) {
  const audit = report.audits?.[id]
  const value = audit?.numericValue
  return {
    value: typeof value === 'number' ? Number(value.toFixed(digits)) : null,
    displayValue: audit?.displayValue ?? null,
  }
}

const record = {
  runId: process.env.GITHUB_RUN_ID ?? null,
  commitSha: process.env.GITHUB_SHA ?? null,
  timestamp: report.fetchTime ?? new Date().toISOString(),
  lighthouseVersion: report.lighthouseVersion ?? null,
  finalUrl: report.finalUrl ?? null,
  performanceScore: Math.round(performanceScore * 100),
  metrics: {
    firstContentfulPaint: metric('first-contentful-paint'),
    largestContentfulPaint: metric('largest-contentful-paint'),
    totalBlockingTime: metric('total-blocking-time'),
    cumulativeLayoutShift: metric('cumulative-layout-shift', 3),
  },
}

let history = { schemaVersion: 1, records: [] }
if (existsSync(historyPath)) {
  history = JSON.parse(readFileSync(historyPath, 'utf8'))
  if (!Array.isArray(history.records)) {
    throw new Error(`Invalid Lighthouse history format: ${historyPath}`)
  }
}

const records = history.records.filter((item) => {
  return !record.runId || item.runId !== record.runId
})
records.push(record)
records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

mkdirSync(dirname(historyPath), { recursive: true })
writeFileSync(historyPath, `${JSON.stringify({ schemaVersion: 1, records }, null, 2)}\n`)

function displayMetric(id, digits = 0) {
  const value = record.metrics[id].value
  if (value === null) return 'n/a'
  return `${value.toFixed(digits)}${id === 'cumulativeLayoutShift' ? '' : ' ms'}`
}

console.log(`Lighthouse mobile performance score: ${record.performanceScore}/100`)
console.log(`First Contentful Paint: ${displayMetric('firstContentfulPaint')}`)
console.log(`Largest Contentful Paint: ${displayMetric('largestContentfulPaint')}`)
console.log(`Total Blocking Time: ${displayMetric('totalBlockingTime')}`)
console.log(`Cumulative Layout Shift: ${displayMetric('cumulativeLayoutShift', 3)}`)
console.log(`Saved ${records.length} Lighthouse history record(s) to ${historyPath}`)
