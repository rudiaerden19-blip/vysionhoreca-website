#!/usr/bin/env node
/**
 * Eenmalig: vysionhoreca.com → vysion-kassa.com + veel voorkomende "horeca"-copy in messages.
 * Draai: node scripts/rebrand-drop-horeca.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

const messageReplacements = [
  ['www.vysionhoreca.com', 'www.vysion-kassa.com'],
  ['vysionhoreca.com', 'vysion-kassa.com'],
  ['Vysion Horeca', "Vysion kassa's"],
  ['Vysion-Horeca', "Vysion kassa's"],
  ['Horeca Platform', "Vysion kassa's platform"],
  ['Horecazaak', 'Zaak'],
  ['horecazaak', 'zaak'],
  ['horecazaken', 'zaken'],
  ['horecaondernemers', 'ondernemers'],
  ['Horecaondernemers', 'Ondernemers'],
  ['vysion horeca', 'vysion kassa'],
  ['Vysion horeca', 'Vysion kassa'],
  ['Horeca kassa', 'Kassa'],
  ['horeca kassa', 'kassa'],
  ['Horeca Kassa', 'Kassa'],
  ['Horeca kassasysteem', 'Kassasysteem'],
  ['horeca kassasysteem', 'kassasysteem'],
  ['horeca software', 'kassa software'],
  ['Horeca software', 'Kassa software'],
  ['horeca POS', 'POS'],
  ['België horeca POS', 'België POS kassa'],
  ['POS horeca', 'POS kassa'],
  ['kassasysteem horeca', 'kassasysteem'],
  ['bestelplatform horeca', 'bestelplatform'],
  ['online bestellen horeca', 'online bestellen'],
  ['horeca bestelplatform', 'online bestelplatform'],
  ['gratis horeca kassa', 'gratis kassa'],
  ['horeca-interieur', 'zaak-interieur'],
  ['horeca- of', 'zaak- of'],
  ['horeca- en', 'zaak- en'],
  ['veel horeca', 'veel zaken'],
  ['Voor de horeca', 'Voor horeca & retail'],
  ['dit horeca-pakket', 'dit pakket'],
  ['prijzen voor horeca kassa', 'prijzen voor kassa'],
  ['prijzen voor de horeca kassa', 'prijzen voor de kassa'],
  ['calculator voor de horeca', 'calculator voor jouw zaak'],
  ['ecosysteem voor de horeca', 'compleet kassa-ecosysteem'],
  ['Actieve horecazaken', 'Actieve zaken'],
  ['uw horecazaak', 'uw zaak'],
  ['horecasector', 'sector'],
  ['horeca,', ''],
  ['horeca ', ''],
  ['Horeca ', ''],
  [' Horeca', ''],
  ['Horeca·', 'Restaurant ·'],
  [' · Horeca', ' · Restaurant'],
  ['catalogModeHoreca": "Horeca"', 'catalogModeHoreca": "Eten & drinken"'],
  ['Bestelplatform voor de horeca', 'Bestelplatform voor zaken'],
  ['snelste horeca kassa', 'snelste kassa'],
  [' voor horeca ', ' voor zaken '],
  ['Unieke feature die geen concurrent heeft. Makkelijk te verkopen aan horeca.', 'Unieke feature die geen concurrent heeft. Makkelijk te verkopen aan zaken.'],
  ['sales/horeca', 'sales/retail'],
  ['horeca digitaliseert', 'zaken digitaliseren'],
]

function applyReplacements(content, list) {
  let out = content
  for (const [from, to] of list) {
    out = out.split(from).join(to)
  }
  return out
}

const messageDir = path.join(root, 'messages')
for (const file of fs.readdirSync(messageDir).filter((f) => f.endsWith('.json'))) {
  const fp = path.join(messageDir, file)
  let text = fs.readFileSync(fp, 'utf8')
  text = applyReplacements(text, messageReplacements)
  fs.writeFileSync(fp, text)
}

const urlReplacePaths = []
function walk(dir, skip) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.some((s) => name === s || name.startsWith(s))) continue
    const fp = path.join(dir, name)
    const st = fs.statSync(fp)
    if (st.isDirectory()) walk(fp, skip)
    else if (/\.(tsx?|jsx?|html|txt|xml|md|mjs|css)$/.test(name)) urlReplacePaths.push(fp)
  }
}

walk(path.join(root, 'src'), [])
walk(path.join(root, 'public'), [])
for (const extra of ['settings.html', 'public/robots.txt', 'next.config.js']) {
  const fp = path.join(root, extra)
  if (fs.existsSync(fp)) urlReplacePaths.push(fp)
}

for (const fp of urlReplacePaths) {
  let text = fs.readFileSync(fp, 'utf8')
  if (!text.includes('vysionhoreca')) continue
  text = text.replace(/https:\/\/www\.vysionhoreca\.com/g, 'https://www.vysion-kassa.com')
  text = text.replace(/www\.vysionhoreca\.com/g, 'www.vysion-kassa.com')
  text = text.replace(/https:\/\/vysionhoreca\.com/g, 'https://www.vysion-kassa.com')
  text = text.replace(/\bvysionhoreca\.com\b/g, 'vysion-kassa.com')
  // tenant subdomains: slug.vysionhoreca.com → slug.ordervysion.com
  text = text.replace(/\.vysionhoreca\.com/g, '.ordervysion.com')
  fs.writeFileSync(fp, text)
}

console.log('rebrand-drop-horeca: done')
