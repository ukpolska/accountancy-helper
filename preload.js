const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('jdgStore', {
  load: () => ipcRenderer.invoke('store:load'),
  save: obj => ipcRenderer.invoke('store:save', obj),
  openFolder: () => ipcRenderer.invoke('store:open'),
  openManual: () => ipcRenderer.invoke('manual:open'),
  profiles: () => ipcRenderer.invoke('profiles:list'),
  profileCreate: (name, seed) => ipcRenderer.invoke('profiles:create', name, seed),
  profileSwitch: id => ipcRenderer.invoke('profiles:switch', id),
  profileRename: (id, name) => ipcRenderer.invoke('profiles:rename', id, name),
  profileRemove: id => ipcRenderer.invoke('profiles:remove', id),
  log: (k, a) => ipcRenderer.invoke('log:append', { k, a }),
  readLog: () => ipcRenderer.invoke('log:read'),
  lookupNip: (nip, keys) => ipcRenderer.invoke('nip:lookup', nip, keys),
  rules: () => ipcRenderer.invoke('rules:bundled'),
  fetchRules: url => ipcRenderer.invoke('rules:fetch', url)
});
