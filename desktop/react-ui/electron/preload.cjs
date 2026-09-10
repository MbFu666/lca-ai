const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  engineStatus: () => ipcRenderer.invoke('engine:status'),
  startEngine: () => ipcRenderer.invoke('engine:start'),
  stopEngine: () => ipcRenderer.invoke('engine:stop'),
  getConfig: () => ipcRenderer.invoke('engine:config'),
  setConfig: (patch) => ipcRenderer.invoke('engine:config-set', patch),
  onEngineStatus: (cb) => {
    const listener = (_e, data) => cb(data)
    ipcRenderer.on('engine:status', listener)
    return () => ipcRenderer.removeListener('engine:status', listener)
  },
  dbList: () => ipcRenderer.invoke('db:list'),
  dbSwitch: (name) => ipcRenderer.invoke('db:switch', name),
  dbCreate: (name) => ipcRenderer.invoke('db:create', name),
  dbCreateCopy: (name, from) => ipcRenderer.invoke('db:create-copy', { name, from }),
  dbDelete: (name) => ipcRenderer.invoke('db:delete', name),
  dbExport: (toPath) => ipcRenderer.invoke('db:export', toPath),
  dbImport: (zipPath, name) => ipcRenderer.invoke('db:import', { zipPath, name }),
  onDbProgress: (cb) => {
    const listener = (_e, data) => cb(data)
    ipcRenderer.on('db:progress', listener)
    return () => ipcRenderer.removeListener('db:progress', listener)
  },
  onDbChanged: (cb) => {
    const listener = (_e, data) => cb(data)
    ipcRenderer.on('db:changed', listener)
    return () => ipcRenderer.removeListener('db:changed', listener)
  },
  dialogSave: (opts) => ipcRenderer.invoke('dialog:save', opts),
  dialogOpen: (opts) => ipcRenderer.invoke('dialog:open', opts),
  fileWrite: (p, content) => ipcRenderer.invoke('file:write', { path: p, content }),
  fileWriteBase64: (p, base64) => ipcRenderer.invoke('file:write-base64', { path: p, base64 }),
  aiCalculate: (description, lang) => ipcRenderer.invoke('ai:calculate', { description, lang }),
  dialogOpenMulti: (opts) => ipcRenderer.invoke('dialog:open-multi', opts),
  cloudProjectsList: () => ipcRenderer.invoke('cloud:projects-list'),
  cloudProjectsSave: (name, note) => ipcRenderer.invoke('cloud:projects-save', { name, note }),
  cloudProjectsOpen: (projectId, dbName) =>
    ipcRenderer.invoke('cloud:projects-open', { projectId, dbName }),
  cloudProjectsDelete: (projectId) => ipcRenderer.invoke('cloud:projects-delete', projectId),
  cloudFoldersList: () => ipcRenderer.invoke('cloud:folders-list'),
  cloudFoldersCreate: (name) => ipcRenderer.invoke('cloud:folders-create', { name }),
  cloudFoldersRename: (id, name) => ipcRenderer.invoke('cloud:folders-rename', { id, name }),
  cloudFoldersDelete: (id) => ipcRenderer.invoke('cloud:folders-delete', id),
  cloudProjectsMove: (projectId, folderId) => ipcRenderer.invoke('cloud:projects-move', { projectId, folderId }),
  authLogin: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  authGet: () => ipcRenderer.invoke('auth:get'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
})
