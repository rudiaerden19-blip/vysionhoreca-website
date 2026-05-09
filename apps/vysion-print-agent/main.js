const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { startServer, listWindowsPrintersSync, buildEscPosPayload, printRawWindows, sleepSyncMs } = require('./server')

const PORT = 9742

let tray = null
let settingsWindow = null
let kassaWindow = null
let serverHandle = null

function configPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(configPath(), 'utf8')
    const j = JSON.parse(raw)
    return {
      printerName: typeof j.printerName === 'string' ? j.printerName : '',
      kassaUrl: typeof j.kassaUrl === 'string' ? j.kassaUrl : '',
      port: typeof j.port === 'number' ? j.port : PORT,
      autoStart: typeof j.autoStart === 'boolean' ? j.autoStart : true,
    }
  } catch {
    return { printerName: '', kassaUrl: '', port: PORT, autoStart: true }
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
    autoHideMenuBar: true,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: false,
      preload: path.join(__dirname, 'kassa-preload.js'),
    },
    title: 'Vysion Kassa',
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

/** Windows: sta registratie toe zodat de kassa meteen naar localhost:9742 kan praten na herstart. */
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
      let result = { ok: false, error: 'no copies' }
      for (let i = 0; i < copies; i++) {
        result = printRawWindows(printerName, payload)
        if (!result.ok) {
          console.error('[agent:print]', i + 1, '/', copies, '→', result.error)
          break
        }
        if (i < copies - 1) sleepSyncMs(700)
      }
      if (result.ok) return { status: 200, body: { success: true } }
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
    openSettings()
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
