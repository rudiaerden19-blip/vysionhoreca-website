const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawnSync } = require('child_process')
const { startServer, listWindowsPrintersSync, buildEscPosPayload, printRawWindows, sleepSyncMs, DRAWER_KICK } = require('./server')

const PORT = 9742
/** Default kassa-URL als de klant nog niets heeft ingesteld
 *  (of als de config kapot is). Dit is direct de admin-kassa van
 *  Geerkens drankenhandel — als die niet ingelogd is, stuurt de
 *  website automatisch door naar de login en daarna terug. */
const DEFAULT_KASSA_URL =
  'https://www.vysionhoreca.com/shop/geerkensdrankenhandel/admin/kassa'

let tray = null
let settingsWindow = null
let kassaWindow = null
let serverHandle = null

function configPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  let j = {}
  try {
    // BOM-tolerant: PowerShell op Windows schrijft soms UTF8-with-BOM weg.
    const raw = fs.readFileSync(configPath(), 'utf8').replace(/^\uFEFF/, '')
    j = JSON.parse(raw)
  } catch { /* config ontbreekt of is corrupt → defaults gebruiken */ }
  const kassaUrlRaw = typeof j.kassaUrl === 'string' ? j.kassaUrl.trim() : ''
  return {
    printerName: typeof j.printerName === 'string' ? j.printerName : '',
    /** Lege of corrupte config? Vul automatisch de Vysion-kassa-URL in. */
    kassaUrl: kassaUrlRaw || DEFAULT_KASSA_URL,
    port: typeof j.port === 'number' ? j.port : PORT,
    /** Default UIT: klant start de kassa zelf via het bureaublad-icoon. */
    autoStart: typeof j.autoStart === 'boolean' ? j.autoStart : false,
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

function createTrayIcon() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'tray.png')
    if (fs.existsSync(iconPath)) return nativeImage.createFromPath(iconPath)
  } catch { /* ignore */ }
  // Oranje 32x32 PNG icoon (zichtbaar in de taakbalk)
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAC3SURBVFhH7ZYxCsJAEEX3BCIiHsALeAHxAB7AExjBg3kDL+AFxBt4AEER3F1FxGTGtJAiu7vJwg4smX+Yxz6GkJIkSZL+J2BmZpJEgAMYwuiZXANEHCCdBogAbkBaigGuQ56gBZCHnACuoAdXQi2gA9YHvABbqBB+QPwCNQBuQB2gB9QBcAMagB5QAc2gA1oHuQBbqBBcQ6cB+gBs0oAc0DrgBtQBs0oAc0DrgBdQAc2gA1oHuQBbqBBcTFk+w0AAAAASUVORK5CYII='
  )
}

function openKassa() {
  if (!config.kassaUrl) {
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
    show: false, // pas tonen na maximize → geen flicker
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(__dirname, 'kassa-preload.js'),
      /**
       * Persistente sessie: cookies + localStorage van de kassa-website
       * (login, instellingen, ...) blijven bewaard zodat de klant niet
       * elke keer opnieuw moet inloggen.
       */
      partition: 'persist:vysion-kassa',
    },
    title: 'Vysion Kassa',
  })
  // Open meteen op vol scherm (maximized) - klant heeft maximale werkruimte.
  kassaWindow.once('ready-to-show', () => {
    try { kassaWindow.maximize() } catch { /* ignore */ }
    kassaWindow.show()
  })
  kassaWindow.loadURL(config.kassaUrl)
  kassaWindow.on('closed', () => {
    kassaWindow = null
  })
}

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return
  }
  settingsWindow = new BrowserWindow({
    width: 480,
    height: 420,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Vysion Print Agent',
  })
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'))
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
}

/** Windows: registreer/verwijder autostart-keys op een ondubbelzinnige manier.
 *  Verwijdert ALTIJD de oude key-namen die in eerdere versies werden gebruikt
 *  (zodat de klant nooit 2x de exe zou opstarten bij Windows-aanmelding). */
function syncWindowsStartup() {
  if (process.platform !== 'win32') return
  try {
    app.setLoginItemSettings({
      openAtLogin: config.autoStart !== false,
      path: process.execPath,
      args: [],
    })
  } catch (e) {
    console.error('setLoginItemSettings', e)
  }
  // Hard-cleanup van legacy Run-keys uit oudere installer-versies (v1.1.0 - v1.1.4).
  // Anders zou Windows zowel onze nieuwe key als de oude triggeren = dubbele kassa.
  const RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
  const legacy = ['VysionPrintAgent']
  for (const name of legacy) {
    try { spawnSync('reg', ['delete', RUN_KEY, '/v', name, '/f'], { windowsHide: true }) } catch {}
  }
  if (config.autoStart === false) {
    // Ook de moderne key (Electron gebruikt 'Vysion Print Agent') wegen.
    try { spawnSync('reg', ['delete', RUN_KEY, '/v', 'Vysion Print Agent', '/f'], { windowsHide: true }) } catch {}
  }
}

/* ------------------------------------------------------------------ *
 *  Login-onthouden voor de kassa-website (DPAPI via safeStorage)
 *  Bewaart email + ww versleuteld in userData/kassa-creds.bin
 *  Het wachtwoord verlaat NOOIT deze PC.
 * ------------------------------------------------------------------ */
function credsPath() { return path.join(app.getPath('userData'), 'kassa-creds.bin') }

ipcMain.handle('kassa-creds:save', (_evt, payload) => {
  try {
    if (!payload || typeof payload.email !== 'string' || typeof payload.password !== 'string') {
      return { ok: false }
    }
    const email = payload.email.trim()
    const password = payload.password
    if (!email || !password) return { ok: false }
    const json = JSON.stringify({ email, password })
    let buf
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      buf = safeStorage.encryptString(json)
    } else {
      // Fallback (bv. eerste run vóór Windows DPAPI ready) — niet ideaal, maar functioneel.
      buf = Buffer.concat([Buffer.from('PLAIN:', 'utf8'), Buffer.from(json, 'utf8')])
    }
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
    if (buf.slice(0, 6).toString('utf8') === 'PLAIN:') {
      json = buf.slice(6).toString('utf8')
    } else if (safeStorage && safeStorage.isEncryptionAvailable()) {
      try { json = safeStorage.decryptString(buf) } catch { return null }
    } else {
      return null
    }
    const parsed = JSON.parse(json)
    if (parsed && parsed.email && parsed.password) {
      return { email: String(parsed.email), password: String(parsed.password) }
    }
    return null
  } catch (e) {
    console.error('[kassa-creds:load]', e)
    return null
  }
})

ipcMain.handle('kassa-creds:clear', () => {
  try {
    const f = credsPath()
    if (fs.existsSync(f)) fs.unlinkSync(f)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) }
  }
})

function clearKassaCreds() {
  try {
    const f = credsPath()
    if (fs.existsSync(f)) fs.unlinkSync(f)
  } catch { /* ignore */ }
}

function buildTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy()
    tray = null
  }
  const icon = createTrayIcon()
  tray = new Tray(icon)
  const versionLabel = `Vysion Print Agent v${app.getVersion()}`
  tray.setToolTip(versionLabel)
  const menu = Menu.buildFromTemplate([
    { label: versionLabel, enabled: false },
    { type: 'separator' },
    { label: 'Open Kassa', click: () => openKassa() },
    { type: 'separator' },
    {
      label: 'Start automatisch bij Windows-aanmelding',
      type: 'checkbox',
      checked: config.autoStart !== false,
      visible: process.platform === 'win32',
      click: (item) => {
        config = { ...config, autoStart: item.checked }
        saveConfig(config)
        syncWindowsStartup()
      },
    },
    { type: 'separator', visible: process.platform === 'win32' },
    { label: 'Instellingen…', click: () => openSettings() },
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
}

ipcMain.handle('kassa:open', () => {
  openKassa()
})

ipcMain.handle('agent:request', (_evt, { path: reqPath, method, body }) => {
  if (method === 'GET' && (reqPath === '/health' || reqPath === '/status')) {
    return { status: 200, body: { ok: true, printerConfigured: !!getPrinterName() } }
  }

  if (method === 'POST' && reqPath === '/print') {
    const printerName = getPrinterName()
    if (!printerName) {
      return { status: 400, body: { success: false, error: 'Geen printer geconfigureerd. Open Instellingen.' } }
    }
    try {
      const payload = buildEscPosPayload(body || {})
      /** Default 2 exemplaren (klant + keuken); website mag overschrijven. */
      const copies = (body && typeof body.copies === 'number' && body.copies >= 1)
        ? Math.min(Math.max(body.copies, 1), 5)
        : 2
      const wantDrawer = !!(body && body.openDrawer === true)
      const firstPayload = wantDrawer ? Buffer.concat([payload, DRAWER_KICK]) : payload
      let result = { ok: false, error: 'no copies' }
      for (let i = 0; i < copies; i++) {
        const buf = i === 0 ? firstPayload : payload
        result = printRawWindows(printerName, buf)
        if (!result.ok) {
          console.error('[agent:print]', i + 1, '/', copies, '→', result.error)
          break
        }
        if (i < copies - 1) sleepSyncMs(700)
      }
      if (result.ok) return { status: 200, body: { success: true, drawer: wantDrawer } }
      return { status: 500, body: { success: false, error: result.error } }
    } catch (e) {
      console.error('[agent:print] exception', e)
      return { status: 500, body: { success: false, error: String(e.message || e) } }
    }
  }

  return { status: 404, body: { error: 'not found' } }
})

ipcMain.handle('printers:list', () => {
  try {
    return { ok: true, printers: listWindowsPrintersSync() }
  } catch (e) {
    return { ok: false, error: String(e?.message || e), printers: [] }
  }
})

ipcMain.handle('config:get', () => ({
  ...config,
  autoStart: config.autoStart !== false,
  agentVersion: app.getVersion(),
}))

ipcMain.handle('config:save', (_evt, partial) => {
  config = {
      printerName: typeof partial.printerName === 'string' ? partial.printerName : config.printerName,
      kassaUrl: typeof partial.kassaUrl === 'string' ? partial.kassaUrl : config.kassaUrl,
      port: typeof partial.port === 'number' ? partial.port : config.port,
      autoStart: typeof partial.autoStart === 'boolean' ? partial.autoStart : config.autoStart,
    }
  saveConfig(config)
  syncWindowsStartup()
  buildTray()
  return { ok: true }
})

// Schakel Chrome Private Network Access blokkering uit zodat de kassa localhost kan bereiken
app.commandLine.appendSwitch('disable-features', 'BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights')

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Klant klikt nogmaals op bureaublad-icoon → kassa naar voren halen.
    if (!getPrinterName() || !config.kassaUrl) openSettings()
    else openKassa()
  })

  app.whenReady().then(() => {
    const port = config.port || PORT
    serverHandle = startServer(getPrinterName, port)
    syncWindowsStartup()
    buildTray()

    if (!getPrinterName() || !config.kassaUrl) {
      openSettings()
    } else {
      openKassa()
    }
  })

  app.on('window-all-closed', () => {
    /* tray keeps alive */
  })

  app.on('before-quit', () => {
    if (serverHandle && serverHandle.close) {
      serverHandle.close()
    }
  })
}
