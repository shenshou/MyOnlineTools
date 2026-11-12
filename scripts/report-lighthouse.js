import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const reportPath = resolve(process.argv[2] || 'artifacts/lighthouse-performance.json')
if (!existsSync(reportPath)) throw new Error(`Lighthouse report not found: ${reportPath}`)

const report = JSON.parse(readFileSync(reportPath, 'utf8'))
const performanceScore = report.categories?.performance?.score
if (typeof performanceScore !== 'number') {
  throw new Error('Lighthouse report does not contain a performance score')
}

function metric(id, digits = 0) {
  const value = report.audits?.[id]?.numericValue
  if (typeof value !== 'number') return 'n/a'
  return `${value.toFixed(digits)}${id === 'cumulative-layout-shift' ? '' : ' ms'}`
}

console.log(`Lighthouse mobile performance score: ${Math.round(performanceScore * 100)}/100`)
console.log(`First Contentful Paint: ${metric('first-contentful-paint')}`)
console.log(`Largest Contentful Paint: ${metric('largest-contentful-paint')}`)
console.log(`Total Blocking Time: ${metric('total-blocking-time')}`)
console.log(`Cumulative Layout Shift: ${metric('cumulative-layout-shift', 3)}`)
