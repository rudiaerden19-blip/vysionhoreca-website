const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vysionAgent', {
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (partial) => ipcRenderer.invoke('config:save', partial),
  openKassa: () => ipcRenderer.invoke('kassa:open'),
  testPrint: () => ipcRenderer.invoke('printer:test'),
  testDrawer: () => ipcRenderer.invoke('printer:testDrawer'),
  diagnose: () => ipcRenderer.invoke('agent:diagnose'),
})
