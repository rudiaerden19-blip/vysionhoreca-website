/**
 * Print-queue voor de Vysion Print Agent.
 *
 *  · Elk inkomend printverzoek wordt eerst meteen geprobeerd.
 *  · Lukt het niet (printer offline, kabel los) → de payload gaat naar
 *    een persistente JSON-queue op disk en de agent probeert
 *    elke 10 seconden opnieuw.
 *  · Bij een crash of stroomonderbreking worden de niet-verstuurde bonnen
 *    automatisch herladen bij de volgende start.
 *  · Geen geheugen-leak: max 50 wachtende jobs (FIFO).
 *
 *  Op deze manier raakt geen bestelling verloren bij een tijdelijke storing.
 */

const fs = require('fs')
const path = require('path')

const RETRY_INTERVAL_MS = 10_000
const MAX_QUEUE_SIZE    = 50
const MAX_AGE_HOURS     = 4   // ouder dan 4u → verwijderen i.p.v. eindeloos retry-en

let queueFile = null
let queue = []          // [{ id, createdAt, attempts, payloadB64, label }]
let timer = null
let printer = null      // function: (buffer) => { ok, error }
let onSuccess = null    // optionele callback per gelukte print

function load() {
  if (!queueFile) return
  try {
    const raw = fs.readFileSync(queueFile, 'utf8')
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) queue = arr.slice(0, MAX_QUEUE_SIZE)
  } catch { /* file ontbreekt of corrupt */ }
}

function persist() {
  if (!queueFile) return
  try {
    fs.mkdirSync(path.dirname(queueFile), { recursive: true })
    fs.writeFileSync(queueFile, JSON.stringify(queue), 'utf8')
  } catch (e) {
    console.error('[queue] persist mislukt', e)
  }
}

function purgeOld() {
  const cutoff = Date.now() - MAX_AGE_HOURS * 3600 * 1000
  const before = queue.length
  queue = queue.filter((j) => j.createdAt >= cutoff)
  if (queue.length !== before) {
    console.warn(`[queue] ${before - queue.length} verouderde job(s) verwijderd (>${MAX_AGE_HOURS}u oud)`)
    persist()
  }
}

function tryFlush() {
  if (queue.length === 0) return
  if (!printer) return
  purgeOld()
  while (queue.length > 0) {
    const job = queue[0]
    job.attempts = (job.attempts || 0) + 1
    const buf = Buffer.from(job.payloadB64, 'base64')
    const r = printer(buf)
    if (r && r.ok) {
      console.info(`[queue] job ${job.id} (${job.label}) gelukt na ${job.attempts} pogingen`)
      queue.shift()
      persist()
      try { onSuccess && onSuccess(job) } catch { /* ignore */ }
    } else {
      console.warn(`[queue] job ${job.id} (${job.label}) attempt ${job.attempts} mislukt: ${r?.error || 'onbekend'}`)
      // Stop met flushen: als nu faalt zal volgend ook falen
      persist()
      return
    }
  }
}

/**
 * Initialiseer de queue.
 *  filePath  - JSON bestand op disk
 *  printerFn - functie die een Buffer print en { ok, error } teruggeeft
 *  successFn - optionele callback per succesvol verwerkte job
 */
function init(filePath, printerFn, successFn) {
  queueFile = filePath
  printer = printerFn
  onSuccess = successFn || null
  load()
  if (timer) clearInterval(timer)
  timer = setInterval(tryFlush, RETRY_INTERVAL_MS)
  if (queue.length > 0) {
    console.info(`[queue] ${queue.length} wachtende bonnen herladen — direct flush`)
    setImmediate(tryFlush)
  }
}

/**
 * Voeg een job toe aan de queue (gebruik dit ALLEEN als realtime print is mislukt).
 */
function enqueue(payloadBuffer, label = '') {
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn('[queue] vol — oudste job laten vervallen')
    queue.shift()
  }
  const id = Math.random().toString(36).slice(2, 8)
  queue.push({
    id,
    createdAt: Date.now(),
    attempts: 0,
    payloadB64: payloadBuffer.toString('base64'),
    label: String(label || '').slice(0, 60),
  })
  persist()
  console.info(`[queue] nieuwe job ${id} (${label}) — ${queue.length} wachten`)
}

function size() { return queue.length }

function clear() {
  queue = []
  persist()
}

function listLabels() {
  return queue.map((j) => `${j.id} · ${j.label || '(geen label)'} · ${j.attempts}x`)
}

module.exports = { init, enqueue, size, clear, listLabels, tryFlush }
