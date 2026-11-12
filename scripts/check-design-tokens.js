import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = 'src'
const files = []

function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) collect(path)
    else if (entry.isFile() && (path.endsWith('.css') || path.endsWith('.vue'))) {
      if (path !== 'src/styles/tokens.css') files.push(path)
    }
  }
}

collect(root)

const colorPattern = /#[\da-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\s*\(|(?:color|background(?:-color)?|border-color)\s*:\s*(?:white|black)\b/g
const findings = []

for (const path of files) {
  const source = readFileSync(path, 'utf8')
  const blocks = path.endsWith('.vue')
    ? [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => ({
        content: match[1],
        offset: match.index + match[0].indexOf(match[1]),
      }))
    : [{ content: source, offset: 0 }]

  for (const block of blocks) {
    for (const match of block.content.matchAll(colorPattern)) {
      const absoluteOffset = block.offset + match.index
      const line = source.slice(0, absoluteOffset).split('\n').length
      findings.push(`${relative('.', path)}:${line}: ${match[0]}`)
    }
  }
}

if (findings.length) {
  console.error('Hard-coded colors found in page/component styles. Add or reuse a theme-aware token in src/styles/tokens.css:')
  for (const finding of findings) console.error(`  ${finding}`)
  process.exitCode = 1
} else {
  console.log(`Design token check passed: scanned ${files.length} CSS/Vue files; no hard-coded color literals found outside tokens.css.`)
}
