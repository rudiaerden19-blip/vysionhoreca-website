/**
 * Cloud print worker — standaard UIT. Alleen HTTPS naar Vercel API.
 * Faalt stil; blokkeert nooit de lokale :9742 server.
 */

const { executePrintRequest } = require('./server.js')

const DEFAULT_POLL_MS = 2500
const DEFAULT_API_BASE = 'https://www.vysionhoreca.com'

function normalizeApiBase(raw) {
  const s = String(raw || '').trim().replace(/\/$/, '')
  return s || DEFAULT_API_BASE
}

function createCloudPrintWorker(deps) {
  const getConfig = deps.getConfig
  const log = deps.log || console
  let timer = null
  let inFlight = false

  async function pollOnce() {
    const cfg = getConfig()
    if (cfg.cloudPrintEnabled !== true) return
    const token = String(cfg.cloudPrintDeviceToken || '').trim()
    if (!token) return
    if (inFlight) return
    inFlight = true
    try {
      const base = normalizeApiBase(cfg.cloudPrintApiBase)
      const claimRes = await fetch(`${base}/api/print-agent/claim`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      })
      if (!claimRes.ok) {
        log.warn('[cloud-print] claim HTTP', claimRes.status)
        return
      }
      const claimJson = await claimRes.json()
      if (!claimJson.ok || !claimJson.job) return

      const job = claimJson.job
      const printCfg = {
        printerName: cfg.printerName,
        kitchenPrinterName: cfg.kitchenPrinterName,
        printerProfile: cfg.printerProfile,
        kassaUrl: cfg.kassaUrl,
      }
      const body = job.payload && typeof job.payload === 'object' ? job.payload : {}
      const printResult = executePrintRequest(body, printCfg)

      const ackStatus = printResult.ok ? 'printed' : 'failed'
      const ackRes = await fetch(`${base}/api/print-agent/ack`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          processingToken: job.processing_token,
          status: ackStatus,
          errorMessage: printResult.ok ? undefined : String(printResult.error || 'print mislukt'),
        }),
      })
      if (!ackRes.ok) {
        log.error('[cloud-print] ack mislukt HTTP', ackRes.status, 'job', job.id)
      }
    } catch (e) {
      log.warn('[cloud-print] poll error (lokaal print blijft werken):', e?.message || e)
    } finally {
      inFlight = false
    }
  }

  function start() {
    stop()
    timer = setInterval(() => {
      void pollOnce()
    }, DEFAULT_POLL_MS)
    setTimeout(() => void pollOnce(), 1200)
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  return { start, stop, pollOnce }
}

module.exports = { createCloudPrintWorker, normalizeApiBase }
