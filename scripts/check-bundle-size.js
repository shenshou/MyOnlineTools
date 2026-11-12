import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'

const assetsDirectory = resolve(process.cwd(), 'dist/assets')
const budgets = {
  totalJavaScriptGzip: 200 * 1024,
  largestJavaScriptGzip: 100 * 1024,
  totalCssGzip: 40 * 1024,
}

function collectFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? collectFiles(path) : [path]
  })
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

if (!statSync(resolve(process.cwd(), 'dist'), { throwIfNoEntry: false }) || !statSync(assetsDirectory, { throwIfNoEntry: false })) {
  throw new Error('未找到 dist/assets，请先运行 npm run build')
}

const files = collectFiles(assetsDirectory)
const javascript = files.filter(path => path.endsWith('.js')).map(path => ({
  path,
  raw: readFileSync(path),
})).map(file => ({ ...file, gzip: gzipSync(file.raw).byteLength }))
const stylesheets = files.filter(path => path.endsWith('.css')).map(path => ({
  path,
  raw: readFileSync(path),
})).map(file => ({ ...file, gzip: gzipSync(file.raw).byteLength }))

if (!javascript.length) throw new Error('构建产物中没有 JavaScript 文件')

const totalJavaScriptGzip = javascript.reduce((total, file) => total + file.gzip, 0)
const largestJavaScriptGzip = Math.max(...javascript.map(file => file.gzip))
const totalCssGzip = stylesheets.reduce((total, file) => total + file.gzip, 0)
const largestChunk = javascript.reduce((largest, file) => file.gzip > largest.gzip ? file : largest)

console.log('Production bundle report')
console.log(`JavaScript: ${formatBytes(totalJavaScriptGzip)} gzip / ${formatBytes(budgets.totalJavaScriptGzip)} budget (${javascript.length} chunks)`)
console.log(`Largest JS chunk: ${formatBytes(largestJavaScriptGzip)} gzip / ${formatBytes(budgets.largestJavaScriptGzip)} budget (${largestChunk.path.split('/').pop()})`)
console.log(`CSS: ${formatBytes(totalCssGzip)} gzip / ${formatBytes(budgets.totalCssGzip)} budget (${stylesheets.length} files)`)

const failures = []
if (totalJavaScriptGzip > budgets.totalJavaScriptGzip) failures.push('JavaScript 总 gzip 体积超出预算')
if (largestJavaScriptGzip > budgets.largestJavaScriptGzip) failures.push('单个 JavaScript chunk gzip 体积超出预算')
if (totalCssGzip > budgets.totalCssGzip) failures.push('CSS 总 gzip 体积超出预算')

if (failures.length) {
  failures.forEach(message => console.error(`✗ ${message}`))
  process.exitCode = 1
} else {
  console.log('✓ Bundle budgets passed')
}
