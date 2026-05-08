const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vysionAgent', {
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (partial) => ipcRenderer.invoke('config:save', partial),
})
