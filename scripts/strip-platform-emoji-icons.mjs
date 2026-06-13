#!/usr/bin/env node
/** Zet emoji in `icon: '…'` velden leeg (platform UI, alle tenants). */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(process.cwd(), 'src')
const EMOJI =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{FE00}-\u{FE0F}\u{200D}]/u

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules') continue
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(tsx|ts)$/.test(name)) out.push(p)
  }
  return out
}

let changed = 0
for (const file of walk(ROOT)) {
  let content = fs.readFileSync(file, 'utf8')
  const next = content.replace(/icon:\s*'([^']*)'/g, (full, val) => {
    if (EMOJI.test(val)) return "icon: ''"
    return full
  })
  if (next !== content) {
    fs.writeFileSync(file, next)
    changed++
  }
}
console.log(`cleared emoji icon fields in ${changed} files`)
