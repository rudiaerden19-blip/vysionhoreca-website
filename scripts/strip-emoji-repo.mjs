#!/usr/bin/env node
/** Verwijder emoji uit tekst (src, public, docs). Slaat apps/vysion-print-agent over. */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'apps',
])

const EMOJI =
  /[\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{FE00}-\u{FE0F}\u{200D}\u{2300}-\u{23FF}\u{2B50}]/gu

const EXT = /\.(ts|tsx|js|mjs|json)$/

function shouldProcess(file) {
  const rel = path.relative(ROOT, file)
  if (rel.startsWith('apps'+ path.sep)) return false
  return EXT.test(file)
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (shouldProcess(p)) out.push(p)
  }
  return out
}

function strip(content) {
  return content.replace(EMOJI, '')
}

const roots = [
  path.join(ROOT, 'src'),
  path.join(ROOT, 'messages'),
  path.join(ROOT, 'public'),
]

const files = new Set()
for (const r of roots) {
  if (!fs.existsSync(r)) continue
  const st = fs.statSync(r)
  if (st.isDirectory()) {
    for (const f of walk(r)) files.add(f)
  } else if (shouldProcess(r)) files.add(r)
}

let changed = 0
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8')
  const next = strip(content)
  if (next !== content) {
    fs.writeFileSync(file, next)
    changed++
    console.log('stripped:', path.relative(ROOT, file))
  }
}
console.log(`done: ${changed} files`)
