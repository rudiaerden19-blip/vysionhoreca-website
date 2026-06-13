#!/usr/bin/env node
/** Herstel kapotte spaties na ' door foutieve emoji-trim (|' → ' |). */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(process.cwd(), 'src')

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') continue
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|js)$/.test(name)) out.push(p)
  }
  return out
}

function fix(content) {
  let c = content
  c = c.replace(/'(\|\|)/g, "' $1")
  c = c.replace(/'(&&)/g, "' $1")
  c = c.replace(/'(\|)(?=\s*')/g, "' $1 ")
  c = c.replace(/\? '':/g, "? '' :")
  return c
}

let n = 0
for (const file of walk(ROOT)) {
  const content = fs.readFileSync(file, 'utf8')
  const next = fix(content)
  if (next !== content) {
    fs.writeFileSync(file, next)
    n++
  }
}
console.log(`fixed ${n} files`)
