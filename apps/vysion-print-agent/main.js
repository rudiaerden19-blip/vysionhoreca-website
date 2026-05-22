/* ---------------------------------------------------------------------------
 *   Vysion Print Agent — main.js (productie)
 *
 *   Verantwoordelijk voor:
 *     · ESC/POS HTTP-server op 127.0.0.1:9742
 *     · Tray-icoon met live health-monitor (groen/oranje/rood)
 *     · Kassa-window (Chromium) met persistente login-sessie
 *     · Setup-wizard (settings.html) met tenant-slug → kassa-URL
 *     · Auto-update via GitHub releases
 *     · Auto-recovery: uncaughtException → log + soft restart
 *     · Watchdog scheduled task (geregistreerd door INSTALLEER.bat)
 *     · Diagnose-knop voor support op afstand
 * ------------------------------------------------------------------------- */

const electron = require('electron')
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, safeStorage, shell, dialog, session } = electron
const path = require('path')
const fs = require('fs')
const os = require('os')
const { spawnSync, spawn } = require('child_process')
const logger = require('./logger')
const printQueue = require('./print-queue')
const {
  startServer,
  listWindowsPrintersSync,
  buildEscPosPayload,
  encInline,
  printRawWindows,
  openCashDrawerWindows,
  kickCashDrawerWindowsParallel,
  sleepSyncMs,
  DRAWER_KICK,
} = require('./server')

// ---- Constants -----------------------------------------------------------
const PORT = 9742
/** Zelfde waarde als `webPreferences.partition` van het kassa-venster — hier wissen we SW + caches. */
const KASSA_SESSION_PARTITION = 'persist:vysion-kassa'
const HEALTH_INTERVAL_MS = 30_000
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000  // elke 4 uur
const GH_OWNER = 'rudiaerden19-blip'
const GH_REPO = 'vysionhoreca-website'
const UPDATE_TAG_PREFIX = 'vysion-print-agent-windows'

// ---- Module-level state --------------------------------------------------
let tray = null
let settingsWindow = null
let kassaWindow = null
let serverHandle = null
let healthTimer = null
let lastHealth = { ok: false, reason: 'starting…' }

// ---- Pre-init: logger + uncaughtException --------------------------------
function resolveAppDataDir() {
  // Werkt op Windows zelfs vóór app.whenReady (gebruikt env var %APPDATA%).
  // Op andere OS gebruiken we $HOME als veilige fallback (alleen voor dev).
  const base = process.env.APPDATA
    || (process.platform === 'darwin'
        ? path.join(process.env.HOME || '/tmp', 'Library', 'Application Support')
        : path.join(process.env.HOME || '/tmp', '.config'))
  return path.join(base, 'vysion-print-agent')
}
const logPath = path.join(resolveAppDataDir(), 'agent.log')
logger.init(logPath)

// Ongeacht waar in de pipeline → log + blijf draaien (watchdog kan herstarten als nodig).
process.on('uncaughtException', (err) => { console.error('[uncaughtException]', err) })
process.on('unhandledRejection', (reason) => { console.error('[unhandledRejection]', reason) })

// ---- Config laden / opslaan ---------------------------------------------
function configPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  let j = {}
  try {
    const raw = fs.readFileSync(configPath(), 'utf8').replace(/^\uFEFF/, '')
    j = JSON.parse(raw)
  } catch { /* config ontbreekt of corrupt → defaults */ }
  return {
    printerName: typeof j.printerName === 'string' ? j.printerName : '',
    kassaUrl:    typeof j.kassaUrl === 'string'    ? j.kassaUrl.trim() : '',
    port:        typeof j.port === 'number'        ? j.port : PORT,
    autoStart:   typeof j.autoStart === 'boolean'  ? j.autoStart : false,
    autoUpdate:  typeof j.autoUpdate === 'boolean' ? j.autoUpdate : true,
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true })
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8')
}

let config = loadConfig()

function getPrinterName() {
  return config.printerName?.trim() || null
}

// ---- Tray-icoontjes (kleur per status) -----------------------------------
function makeColorIcon(rgb) {
  // Klein 32x32 PNG met de 3 statuskleuren in een rondje (gegenereerd in code).
  // Voor zuiverheid laden we eerst een file als die bestaat (assets/tray-*.png),
  // anders bouwen we via dataURL met de kleur.
  try {
    const file = path.join(__dirname, 'assets', `tray-${rgb}.png`)
    if (fs.existsSync(file)) return nativeImage.createFromPath(file)
  } catch { /* ignore */ }
  // Eenvoudig fallback-icoon
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC3SURBVFhH7ZYxCsJAEEX3BCIiHsALeAHxAB7AExjBg3kDL+AFxBt4AEER3F1FxGTGtJAiu7vJwg4smX+Yxz6GkJIkSZL+J2BmZpJEgAMYwuiZXANEHCCdBogAbkBaigGuQ56gBZCHnACuoAdXQi2gA9YHvACuQB6gBZCHnACuoAdXQi2gA9YHvABbqBB+QPwCNQBuQB2gB9QBcAMagB5QAc2gA1oHuQBbqBBcQ6cB+gBs0oAc0DrgBtQBs0oAc0DrgBdQAc2gA1oHuQBbqBBcTFk+w0AAAAASUVORK5CYII='
  )
}

function pickIcon() {
  if (!getPrinterName() || !config.kassaUrl) return makeColorIcon('orange')
  if (!lastHealth.ok)                          return makeColorIcon('red')
  return makeColorIcon('green')
}

/**
 * Leegt HTTP-cache, Service Workers en Cache Storage voor het kassa-browserprofiel.
 * Lost o.a. ontbrekende productfoto's op (corrupte SW-image-cache) zonder login/cookies te wissen.
 */
async function clearKassaPartitionCache() {
  const ses = session.fromPartition(KASSA_SESSION_PARTITION)
  try {
    await ses.clearCache()
  } catch (e) {
    console.error('[kassa-cache] clearCache', e)
  }
  try {
    await ses.clearStorageData({
      storages: ['serviceworkers', 'cachestorage', 'shadercache'],
    })
  } catch (e) {
    console.error('[kassa-cache] clearStorageData', e)
  }
  console.info('[kassa-cache] partition geleegd:', KASSA_SESSION_PARTITION)
  if (kassaWindow && !kassaWindow.isDestroyed()) {
    try {
      kassaWindow.webContents.reloadIgnoringCache()
    } catch (e) {
      console.error('[kassa-cache] reload', e)
    }
  }
}

// ---- Kassa-window --------------------------------------------------------
function openKassa() {
  if (!config.kassaUrl || !getPrinterName()) {
    openSettings()
    return
  }
  if (kassaWindow && !kassaWindow.isDestroyed()) {
    kassaWindow.focus()
    return
  }
  kassaWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(__dirname, 'kassa-preload.js'),
      partition: KASSA_SESSION_PARTITION,
      backgroundThrottling: false, // achtergrond-tab niet vertragen → polls werken
    },
    title: 'Vysion Kassa',
  })
  kassaWindow.once('ready-to-show', () => {
    try { kassaWindow.maximize() } catch { /* ignore */ }
    kassaWindow.show()
  })
  // F5 / Ctrl+R / Ctrl+Shift+R → hard reload (cache wissen)
  kassaWindow.webContents.on('before-input-event', (_evt, input) => {
    if (input.type !== 'keyDown') return
    if (input.key === 'F5' || (input.control && (input.key === 'r' || input.key === 'R'))) {
      try { kassaWindow.webContents.reloadIgnoringCache() } catch { /* ignore */ }
    }
  })
  kassaWindow.loadURL(config.kassaUrl)
  kassaWindow.on('closed', () => { kassaWindow = null })
  console.info('[kassa] geopend op', config.kassaUrl)
}

// ---- Settings-window -----------------------------------------------------
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 520,
    height: 760,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Vysion Print Agent',
  })
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'))
  settingsWindow.on('closed', () => { settingsWindow = null })
}

// ---- Windows-startup synchronisatie --------------------------------------
function syncWindowsStartup() {
  if (process.platform !== 'win32') return
  try {
    app.setLoginItemSettings({
      openAtLogin: config.autoStart === true,
      path: process.execPath,
      args: [],
    })
  } catch (e) { console.error('setLoginItemSettings', e) }
  // Hard cleanup van legacy/dubbele Run-keys uit oudere versies.
  const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  for (const name of ['VysionPrintAgent']) {
    try { spawnSync('reg', ['delete', RUN_KEY, '/v', name, '/f'], { windowsHide: true }) } catch {}
  }
  if (!config.autoStart) {
    try { spawnSync('reg', ['delete', RUN_KEY, '/v', 'Vysion Print Agent', '/f'], { windowsHide: true }) } catch {}
  }
}

// ---- Login-onthouden (DPAPI via safeStorage) -----------------------------
function credsPath() { return path.join(app.getPath('userData'), 'kassa-creds.bin') }

ipcMain.handle('kassa-creds:save', (_evt, payload) => {
  try {
    if (!payload || typeof payload.email !== 'string' || typeof payload.password !== 'string') return { ok: false }
    const email = payload.email.trim()
    const password = payload.password
    if (!email || !password) return { ok: false }
    const json = JSON.stringify({ email, password })
    let buf
    if (safeStorage && safeStorage.isEncryptionAvailable()) buf = safeStorage.encryptString(json)
    else buf = Buffer.concat([Buffer.from('PLAIN:', 'utf8'), Buffer.from(json, 'utf8')])
    fs.mkdirSync(path.dirname(credsPath()), { recursive: true })
    fs.writeFileSync(credsPath(), buf)
    return { ok: true }
  } catch (e) {
    console.error('[kassa-creds:save]', e)
    return { ok: false, error: String(e?.message || e) }
  }
})

ipcMain.handle('kassa-creds:load', () => {
  try {
    const f = credsPath()
    if (!fs.existsSync(f)) return null
    const buf = fs.readFileSync(f)
    let json
    if (buf.slice(0, 6).toString('utf8') === 'PLAIN:') json = buf.slice(6).toString('utf8')
    else if (safeStorage && safeStorage.isEncryptionAvailable()) {
      try { json = safeStorage.decryptString(buf) } catch { return null }
    } else return null
    const parsed = JSON.parse(json)
    if (parsed && parsed.email && parsed.password) return { email: String(parsed.email), password: String(parsed.password) }
    return null
  } catch (e) { console.error('[kassa-creds:load]', e); return null }
})

ipcMain.handle('kassa-creds:clear', () => {
  try { const f = credsPath(); if (fs.existsSync(f)) fs.unlinkSync(f); return { ok: true } }
  catch (e) { return { ok: false, error: String(e?.message || e) } }
})

function clearKassaCreds() {
  try { const f = credsPath(); if (fs.existsSync(f)) fs.unlinkSync(f) }
  catch { /* ignore */ }
}

// ---- Health monitor ------------------------------------------------------
function checkHealth() {
  const printerName = getPrinterName()
  if (!printerName) {
    lastHealth = { ok: false, reason: 'geen printer geconfigureerd' }
    return
  }
  try {
    const printers = listWindowsPrintersSync()
    if (!Array.isArray(printers) || !printers.includes(printerName)) {
      lastHealth = { ok: false, reason: `printer "${printerName}" niet gevonden in Windows` }
    } else {
      lastHealth = { ok: true, reason: `OK — ${printerName}` }
    }
  } catch (e) {
    lastHealth = { ok: false, reason: String(e?.message || e) }
  }
}

function startHealthLoop() {
  checkHealth()
  if (healthTimer) clearInterval(healthTimer)
  healthTimer = setInterval(() => {
    const before = lastHealth.ok
    checkHealth()
    if (before !== lastHealth.ok) {
      console.info('[health] verandering →', lastHealth.reason)
      buildTray()
    }
  }, HEALTH_INTERVAL_MS)
}

// ---- Tray-menu -----------------------------------------------------------
function buildTray() {
  try {
    if (tray && !tray.isDestroyed()) { tray.destroy(); tray = null }
    tray = new Tray(pickIcon())
    const versionLabel = `Vysion Print Agent v${app.getVersion()}`
    const queueCount = printQueue.size()
    const queueLine = queueCount > 0 ? `Wachtrij: ${queueCount} bon(nen)` : 'Wachtrij: leeg'
    const tooltip = `${versionLabel}\n${lastHealth.reason}\n${queueLine}`
    tray.setToolTip(tooltip)
    const menu = Menu.buildFromTemplate([
      { label: versionLabel, enabled: false },
      { label: lastHealth.ok ? `✓ ${lastHealth.reason}` : `! ${lastHealth.reason}`, enabled: false },
      { label: queueLine, enabled: false },
      { type: 'separator' },
      { label: 'Open Kassa',                  click: () => openKassa() },
      { label: 'Instellingen…',               click: () => openSettings() },
      { type: 'separator' },
      { label: 'Test bonnetje printen',       click: () => doTestPrint() },
      { label: 'Lade testen',                 click: () => doTestDrawer() },
      {
        label: queueCount > 0 ? `Wachtrij nu opnieuw proberen (${queueCount})` : 'Wachtrij opnieuw proberen',
        enabled: queueCount > 0,
        click: () => { printQueue.tryFlush(); buildTray() },
      },
      {
        label: 'Wachtrij wissen (verloren bonnen)',
        enabled: queueCount > 0,
        click: () => {
          if (dialog.showMessageBoxSync({
            type: 'warning', buttons: ['Wissen', 'Annuleren'], defaultId: 1, cancelId: 1,
            message: `Wilt u ${queueCount} wachtende bon(nen) verwijderen zonder te printen?`,
          }) === 0) { printQueue.clear(); buildTray() }
        },
      },
      { label: 'Diagnose kopiëren',           click: () => doCopyDiagnose() },
      { label: 'Logbestand openen',           click: () => shell.openPath(logger.getLogFilePath()) },
      { type: 'separator' },
      { label: 'Controleer op updates',       click: () => checkForUpdates(true) },
      {
        label: 'Start automatisch bij Windows-aanmelding',
        type: 'checkbox',
        checked: config.autoStart === true,
        visible: process.platform === 'win32',
        click: (item) => {
          config = { ...config, autoStart: item.checked }
          saveConfig(config)
          syncWindowsStartup()
        },
      },
      { type: 'separator' },
      {
        label: 'Kassa-cache legen (foto\'s / service worker)',
        click: async () => {
          await clearKassaPartitionCache()
          dialog.showMessageBox({
            type: 'info',
            title: 'Vysion Print Agent',
            message:
              'De cache van het kassa-venster is geleegd (HTTP-cache, service worker, afbeeldings-cache).\n\n' +
              'Ingelogd blijven: cookies en lokale opslag zijn niet gewist.\n\n' +
              'Het kassa-venster is vernieuwd als het open stond.',
          })
        },
      },
      {
        label: 'Opgeslagen wachtwoord wissen',
        click: () => {
          clearKassaCreds()
          if (kassaWindow && !kassaWindow.isDestroyed()) {
            try { kassaWindow.webContents.session.clearStorageData() } catch { /* ignore */ }
          }
        },
      },
      { type: 'separator' },
      { label: 'Afsluiten', click: () => app.quit() },
    ])
    tray.setContextMenu(menu)
    tray.on('click', () => openKassa())
  } catch (e) { console.error('[tray] build mislukt', e) }
}

// ---- Test-acties ---------------------------------------------------------
function buildTestReceiptPayload() {
  const ESC = 0x1b, GS = 0x1d
  const c = []
  c.push(Buffer.from([ESC, 0x40]))                     // init
  c.push(Buffer.from([ESC, 0x61, 0x01]))               // align center
  c.push(Buffer.from([GS, 0x21, 0x11]))                // double size
  c.push(Buffer.from('VYSION TEST\n', 'latin1'))
  c.push(Buffer.from([GS, 0x21, 0x00]))
  c.push(Buffer.from('\n', 'latin1'))
  // Geen raw toLocaleString → latin1: NBSP/thin-space (≥128) desynchroniseert Chinese/GBK-firmware.
  c.push(Buffer.concat([encInline(`v${app.getVersion()}`), Buffer.from([0x0a])]))
  c.push(Buffer.concat([encInline(new Date().toLocaleString('nl-BE')), Buffer.from([0x0a])]))
  c.push(Buffer.from('\n----------------------------------------\n', 'latin1'))
  c.push(Buffer.from('Bonprinter werkt!\n', 'latin1'))
  c.push(Buffer.from('\n\n\n\n', 'latin1'))
  c.push(Buffer.from([GS, 0x56, 0x01]))                // partial cut
  return Buffer.concat(c)
}

function doTestPrint() {
  const printerName = getPrinterName()
  if (!printerName) return { ok: false, error: 'Geen printer geconfigureerd.' }
  const r = printRawWindows(printerName, buildTestReceiptPayload())
  console.info('[test:print]', r.ok ? 'OK' : `FOUT: ${r.error}`)
  return r
}

function doTestDrawer() {
  const printerName = getPrinterName()
  if (!printerName) return { ok: false, error: 'Geen printer geconfigureerd.' }
  const r = openCashDrawerWindows(printerName)
  console.info('[test:drawer]', r.ok ? 'OK' : `FOUT: ${r.error}`)
  return r
}

ipcMain.handle('printer:test',       () => {
  const r = doTestPrint()
  return { success: !!r.ok, error: r.error }
})
ipcMain.handle('printer:testDrawer', () => {
  const r = doTestDrawer()
  return { success: !!r.ok, error: r.error }
})

// ---- Diagnose ------------------------------------------------------------
function doCopyDiagnose() {
  try {
    const txt = buildDiagnoseText()
    electron.clipboard.writeText(txt)
    if (tray) tray.displayBalloon({ title: 'Diagnose gekopieerd', content: 'Plak in WhatsApp/email naar Vysion support.' })
  } catch (e) { console.error('[diagnose]', e) }
}

function buildDiagnoseText() {
  const printers = (() => { try { return listWindowsPrintersSync() } catch { return [] } })()
  const lines = []
  lines.push(`Vysion Print Agent v${app.getVersion()}`)
  lines.push(`OS: ${os.platform()} ${os.release()} (${os.arch()})`)
  lines.push(`Hostname: ${os.hostname()}`)
  lines.push(`Time: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(`Printer: ${getPrinterName() || '(geen)'}`)
  lines.push(`Kassa-URL: ${config.kassaUrl || '(geen)'}`)
  lines.push(`AutoStart: ${config.autoStart === true}`)
  lines.push(`AutoUpdate: ${config.autoUpdate !== false}`)
  lines.push(`Health: ${lastHealth.ok ? 'OK' : 'FOUT'} — ${lastHealth.reason}`)
  lines.push('')
  lines.push('Windows printers:')
  for (const p of printers) lines.push('  - ' + p)
  lines.push('')
  lines.push('Recente log-regels (max 80):')
  const logs = logger.getRecentLines().slice(-80)
  for (const l of logs) lines.push(l.replace(/\n$/, ''))
  return lines.join('\n')
}

ipcMain.handle('agent:diagnose', () => {
  return { text: buildDiagnoseText() }
})

// ---- Auto-update via GitHub releases (geen electron-updater dep) ---------
async function checkForUpdates(interactive) {
  try {
    const url = `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases?per_page=20`
    console.info('[update] GitHub releases ophalen…')
    const res = await fetch(url, { headers: { 'User-Agent': 'vysion-print-agent' } })
    if (!res.ok) throw new Error(`GitHub ${res.status}`)
    const releases = await res.json()
    const release = releases.find((r) =>
      r && typeof r.tag_name === 'string' &&
      r.tag_name.toLowerCase().startsWith(UPDATE_TAG_PREFIX.toLowerCase()) &&
      Array.isArray(r.assets) && r.assets.length > 0 && !r.draft && !r.prerelease
    )
    if (!release) {
      if (interactive) dialog.showMessageBox({ type: 'info', message: 'Geen releases gevonden.' })
      return
    }
    const remoteVersion = (release.tag_name.match(/(\d+\.\d+\.\d+)/) || [])[1]
    if (!remoteVersion) return
    if (compareVersions(remoteVersion, app.getVersion()) <= 0) {
      console.info('[update] up-to-date (huidig:', app.getVersion(), ', online:', remoteVersion, ')')
      if (interactive) dialog.showMessageBox({ type: 'info', message: `U gebruikt al de nieuwste versie (v${app.getVersion()}).` })
      return
    }
    console.info(`[update] nieuwe versie beschikbaar: v${remoteVersion} (huidig: v${app.getVersion()})`)
    const choice = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['Update nu', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Vysion Print Agent — update',
      message: `Versie v${remoteVersion} is beschikbaar (u heeft v${app.getVersion()}).`,
      detail: 'Wilt u de update nu installeren? De kassa wordt heel even gesloten en automatisch opnieuw geopend.',
    })
    if (choice !== 0) return
    // Vind de juiste asset (Setup .exe NSIS) of een zip met win-unpacked
    const setupAsset = release.assets.find((a) => /Setup.*\.exe$/i.test(a.name))
    const zipAsset   = release.assets.find((a) => /\.zip$/i.test(a.name))
    const asset = setupAsset || zipAsset
    if (!asset) {
      dialog.showErrorBox('Update', 'Geen geschikt installatiebestand gevonden in de release.')
      return
    }
    await downloadAndInstallUpdate(asset.browser_download_url, !!setupAsset)
  } catch (e) {
    console.error('[update]', e)
    if (interactive) dialog.showErrorBox('Update', `Update controle mislukt: ${e.message || e}`)
  }
}

function compareVersions(a, b) {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
  return 0
}

async function downloadAndInstallUpdate(downloadUrl, isSetupExe) {
  const tmpDir = path.join(os.tmpdir(), 'vysion-print-agent-update')
  try { fs.mkdirSync(tmpDir, { recursive: true }) } catch { /* ignore */ }
  const tmpFile = path.join(tmpDir, isSetupExe ? 'VysionPrintAgent-Setup.exe' : 'VysionPrintAgent.zip')
  console.info('[update] download:', downloadUrl, '→', tmpFile)
  const res = await fetch(downloadUrl, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  fs.writeFileSync(tmpFile, buf)
  console.info('[update] gedownload (', buf.length, 'bytes); installer wordt gestart…')
  if (isSetupExe) {
    spawn(tmpFile, ['/S'], { detached: true, stdio: 'ignore' }).unref()
  } else {
    // ZIP variant: pak uit naar install-directory en herstart.
    // Voor nu val ik terug op shell.openPath zodat klant manueel installeert.
    shell.openPath(tmpFile)
  }
  setTimeout(() => app.quit(), 1500)
}

// ---- IPC voor settings-window --------------------------------------------
ipcMain.handle('kassa:open',     () => { openKassa() })
ipcMain.handle('printers:list',  () => {
  try { return { ok: true, printers: listWindowsPrintersSync() } }
  catch (e) { return { ok: false, error: String(e?.message || e), printers: [] } }
})
ipcMain.handle('config:get', () => ({
  ...config,
  agentVersion: app.getVersion(),
}))
ipcMain.handle('config:save', (_evt, partial) => {
  config = {
    printerName: typeof partial.printerName === 'string' ? partial.printerName : config.printerName,
    kassaUrl:    typeof partial.kassaUrl === 'string'    ? partial.kassaUrl    : config.kassaUrl,
    port:        typeof partial.port === 'number'        ? partial.port        : config.port,
    autoStart:   typeof partial.autoStart === 'boolean'  ? partial.autoStart   : config.autoStart,
    autoUpdate:  typeof partial.autoUpdate === 'boolean' ? partial.autoUpdate  : config.autoUpdate,
  }
  saveConfig(config)
  syncWindowsStartup()
  checkHealth()
  buildTray()
  return { ok: true }
})

// ---- IPC: agent:request bridge (kassa-window → printer) ------------------
ipcMain.handle('agent:request', async (_evt, { path: reqPath, method, body }) => {
  if (method === 'GET' && (reqPath === '/health' || reqPath === '/status')) {
    return { status: 200, body: { ok: true, printerConfigured: !!getPrinterName(), health: lastHealth } }
  }
  if (method === 'POST' && reqPath === '/drawer') {
    const printerName = getPrinterName()
    if (!printerName) return { status: 400, body: { success: false, error: 'Geen printer geconfigureerd.' } }
    try {
      const r = openCashDrawerWindows(printerName)
      if (r.ok) return { status: 200, body: { success: true } }
      return { status: 500, body: { success: false, error: r.error } }
    } catch (e) {
      return { status: 500, body: { success: false, error: String(e.message || e) } }
    }
  }
  if (method === 'POST' && reqPath === '/print') {
    const printerName = getPrinterName()
    if (!printerName) return { status: 400, body: { success: false, error: 'Geen printer geconfigureerd. Open Instellingen.' } }
    try {
      const payload = buildEscPosPayload(body || {})
      const copies = (body && typeof body.copies === 'number' && body.copies >= 1)
        ? Math.min(Math.max(body.copies, 1), 5) : 2
      const wantDrawer = !!(body && body.openDrawer === true)
      const orderLabel = body?.orderData?.orderNumber
        ? `bon #${body.orderData.orderNumber}`
        : (body?.receiptMode === 'keuken' ? 'keukenbon' : 'kassabon')
      /** Gelijk aan server.js INTER_RECEIPT_COPY_PAUSE_MS — kortere maar veilige tussenpauze voor tweede kopie. */
      const INTER_RECEIPT_COPY_PAUSE_MS = 560
      let result = { ok: false, error: 'no copies' }
      for (let i = 0; i < copies; i++) {
        if (wantDrawer && i === 0) {
          kickCashDrawerWindowsParallel(printerName)
        }
        result = printRawWindows(printerName, payload)
        if (!result.ok) {
          console.error('[agent:print]', i + 1, '/', copies, '→', result.error)
          // Eerste attempt mislukt → in de queue (geen bon verloren laten gaan).
          if (i === 0) {
            const remaining = copies - i
            for (let q = 0; q < remaining; q++) printQueue.enqueue(payload, `${orderLabel} (${q+1}/${remaining})`)
          }
          break
        }
        if (i < copies - 1) sleepSyncMs(INTER_RECEIPT_COPY_PAUSE_MS)
      }
      if (result.ok) return { status: 200, body: { success: true, drawer: wantDrawer, queued: 0 } }
      return {
        status: 202,                          // accepted (in queue, niet direct gelukt)
        body: { success: false, error: result.error, queued: printQueue.size() },
      }
    } catch (e) {
      console.error('[agent:print] exception', e)
      return { status: 500, body: { success: false, error: String(e.message || e) } }
    }
  }
  return { status: 404, body: { error: 'not found' } }
})

// ---- Boot-time integrity check ------------------------------------------
/**
 * Controleert kritieke files (PowerShell scripts, watchdog, settings) zodat
 * we héél vroeg een duidelijke melding tonen i.p.v. uren later een vage fout.
 * Resultaat staat in console + log; als iets ontbreekt verschijnt een dialog.
 */
function runIntegrityCheck() {
  const required = [
    { name: 'print-raw.ps1', mustExist: true },
    { name: 'open-drawer.ps1', mustExist: true },
    { name: 'settings.html', mustExist: true },
    { name: 'kassa-preload.js', mustExist: true },
    { name: 'preload.js', mustExist: true },
  ]
  const missing = []
  // Bij asar-build: zoek in resources/app.asar.unpacked + in app.asar zelf via __dirname
  for (const r of required) {
    const direct = path.join(__dirname, r.name)
    const unpacked = direct.replace('app.asar', 'app.asar.unpacked')
    if (!fs.existsSync(direct) && !fs.existsSync(unpacked)) missing.push(r.name)
  }
  if (missing.length === 0) {
    console.info('[integrity] alle kritieke bestanden aanwezig')
    return
  }
  const msg = `Integriteit-check: ontbrekende bestanden: ${missing.join(', ')}\nDe agent kan niet correct werken — herinstalleer de Print Agent via INSTALLEER.bat.`
  console.error('[integrity]', msg)
  try { dialog.showErrorBox('Vysion Print Agent', msg) } catch { /* ignore */ }
}

// ---- App lifecycle -------------------------------------------------------
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  console.warn('[lock] al een instance actief → afsluiten')
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!getPrinterName() || !config.kassaUrl) openSettings()
    else openKassa()
  })

  app.whenReady().then(() => {
    runIntegrityCheck()
    try {
      const port = config.port || PORT
      serverHandle = startServer(getPrinterName, port)
    } catch (e) {
      console.error('[server] start mislukt', e)
    }
    // Print-queue: bewaart bonnen die niet direct verstuurd konden worden.
    const queueFile = path.join(resolveAppDataDir(), 'print-queue.json')
    printQueue.init(queueFile, (buf) => {
      const printerName = getPrinterName()
      if (!printerName) return { ok: false, error: 'geen printer' }
      return printRawWindows(printerName, buf)
    }, () => buildTray())
    syncWindowsStartup()
    startHealthLoop()
    buildTray()
    if (!getPrinterName() || !config.kassaUrl) openSettings()
    else openKassa()

    // Update-check 30s na opstart, daarna elke 4u
    if (config.autoUpdate !== false) {
      setTimeout(() => checkForUpdates(false), 30_000)
      setInterval(() => checkForUpdates(false), UPDATE_CHECK_INTERVAL_MS)
    }
  })

  app.on('window-all-closed', () => { /* tray keeps alive */ })

  app.on('before-quit', () => {
    if (healthTimer) clearInterval(healthTimer)
    if (serverHandle && serverHandle.close) serverHandle.close()
    console.info('==== Vysion Print Agent afsluiten ====')
  })
}
