/**
 * Tijdgestempelde, roterende logger voor de Vysion Print Agent.
 *
 *  - Schrijft naar  %APPDATA%\vysion-print-agent\agent.log
 *  - Roteert > 2 MB → agent.log.1 (oudere wordt overschreven)
 *  - Houdt laatste 500 regels in geheugen voor de diagnose-knop
 *  - Vangt console.log/info/warn/error af en stuurt ze óók naar het logbestand
 *  - Ongeacht crash-timing blijft het bestand consistent (sync writes)
 */

const fs = require('fs')
const path = require('path')

const MAX_BYTES   = 2 * 1024 * 1024 // 2 MB
const MAX_BUFFER  = 500              // recent in-memory regels
const recent      = []
let logFile       = null
let initialised   = false

function fmtTs(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())} ` +
    `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`
  )
}

function rotateIfNeeded() {
  if (!logFile) return
  try {
    const st = fs.statSync(logFile)
    if (st.size > MAX_BYTES) {
      const old = `${logFile}.1`
      try { fs.unlinkSync(old) } catch { /* ignore */ }
      fs.renameSync(logFile, old)
    }
  } catch { /* file ontbreekt — fine */ }
}

function writeLine(level, args) {
  const ts = fmtTs()
  const msg = args
    .map((a) => {
      if (a instanceof Error) return `${a.message}\n${a.stack || ''}`
      if (typeof a === 'string') return a
      try { return JSON.stringify(a) } catch { return String(a) }
    })
    .join(' ')
  const line = `${ts} [${level}] ${msg}\n`

  recent.push(line)
  if (recent.length > MAX_BUFFER) recent.shift()

  if (logFile) {
    try {
      rotateIfNeeded()
      fs.appendFileSync(logFile, line, 'utf8')
    } catch { /* disk vol of permissions — log silent */ }
  }
}

/** Initialiseer met het pad waar de logfile mag komen. Idempotent. */
function init(filePath) {
  if (initialised) return
  initialised = true
  logFile = filePath
  try { fs.mkdirSync(path.dirname(filePath), { recursive: true }) } catch { /* ignore */ }

  const orig = {
    log:   console.log.bind(console),
    info:  console.info.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console),
  }
  console.log   = (...a) => { try { writeLine('INFO',  a) } catch {} ; orig.log(...a) }
  console.info  = (...a) => { try { writeLine('INFO',  a) } catch {} ; orig.info(...a) }
  console.warn  = (...a) => { try { writeLine('WARN',  a) } catch {} ; orig.warn(...a) }
  console.error = (...a) => { try { writeLine('ERROR', a) } catch {} ; orig.error(...a) }

  writeLine('INFO', [`==== Vysion Print Agent gestart (pid=${process.pid}) ====`])
}

function getRecentLines() {
  return recent.slice()
}

function getLogFilePath() {
  return logFile
}

module.exports = { init, getRecentLines, getLogFilePath }
