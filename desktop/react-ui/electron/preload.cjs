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
  aiReportNarrative: (payload) => ipcRenderer.invoke('ai:report-narrative', { payload }),
  aiExtractInventory: (text, lang) => ipcRenderer.invoke('ai:extract-inventory', { text, lang }),
  extractText: (path) => ipcRenderer.invoke('file:extract-text', { path }),
  cloudReportSave: (reportData) => ipcRenderer.invoke('cloud:report-save', { reportData }),
  cloudReportsList: () => ipcRenderer.invoke('cloud:reports-list'),
  authLogin: (email, password) => ipcRenderer.invoke('auth:login', { email, password }),
  checkUpdates: () => ipcRenderer.invoke('app:check-updates'),
  appVersion: () => ipcRenderer.invoke('app:version'),
  downloadUpdates: () => ipcRenderer.invoke('app:download-updates'),
  installUpdates: () => ipcRenderer.invoke('app:install-updates'),
  onUpdateEvent: (cb) => {
    const chans = ['update:checking', 'update:available', 'update:not-available', 'update:progress', 'update:downloaded', 'update:error']
    const listeners = chans.map((c) => {
      const l = (_e, payload) => cb({ type: c.replace('update:', ''), payload })
      ipcRenderer.on(c, l)
      return [c, l]
    })
    return () => listeners.forEach(([c, l]) => ipcRenderer.removeListener(c, l))
  },
  authGet: () => ipcRenderer.invoke('auth:get'),
  authLogout: () => ipcRenderer.invoke('auth:logout'),
  winMinimize: () => ipcRenderer.invoke('win:minimize'),
  winMaximize: () => ipcRenderer.invoke('win:maximize'),
  winClose: () => ipcRenderer.invoke('win:close'),
  winIsMaximized: () => ipcRenderer.invoke('win:is-maximized'),
  newWindow: () => ipcRenderer.invoke('win:new'),
  editAction: (op) => ipcRenderer.invoke('edit:action', op),
  viewAction: (op) => ipcRenderer.invoke('win:view', op),
  onWinMaximized: (cb) => {
    const listener = (_e, v) => cb(v)
    ipcRenderer.on('win:maximized', listener)
    return () => ipcRenderer.removeListener('win:maximized', listener)
  },
  onMenuAction: (cb) => {
    const listener = (_e, id) => cb(id)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  },
})
