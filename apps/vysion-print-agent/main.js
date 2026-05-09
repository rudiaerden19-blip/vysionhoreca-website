const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron')
const path = require('path')
const fs = require('fs')
const { startServer, listWindowsPrintersSync } = require('./server')

const PORT = 9742

let tray = null
let settingsWindow = null
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
      port: typeof j.port === 'number' ? j.port : PORT,
      autoStart: typeof j.autoStart === 'boolean' ? j.autoStart : true,
    }
  } catch {
    return { printerName: '', port: PORT, autoStart: true }
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
  } catch {
    /* ignore */
  }
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwADgwJ/lSlidQAAAABJRU5ErkJggg=='
  )
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
  tray.setToolTip('Vysion Print Agent')
  const menu = Menu.buildFromTemplate([
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
  tray.on('click', () => openSettings())
}

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
}))

ipcMain.handle('config:save', (_evt, partial) => {
  config = {
    printerName: typeof partial.printerName === 'string' ? partial.printerName : config.printerName,
    port: typeof partial.port === 'number' ? partial.port : config.port,
    autoStart: typeof partial.autoStart === 'boolean' ? partial.autoStart : config.autoStart,
  }
  saveConfig(config)
  syncWindowsStartup()
  buildTray()
  return { ok: true }
})

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

    if (!getPrinterName()) {
      openSettings()
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
