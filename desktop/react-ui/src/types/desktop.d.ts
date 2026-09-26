export interface EngineStatusInfo {
  state: 'stopped' | 'starting' | 'online' | 'error'
  message: string
  managed: boolean
}

export interface DbInfo {
  name: string
  active: boolean
  isBase: boolean
  sizeMb: number
}

export interface DbListResult {
  current: string
  databases: DbInfo[]
}

export interface DbProgress {
  phase: 'unpack' | 'import' | 'export' | 'done'
  done: number
  total: number
  note?: string
}

export interface CloudFolder {
  id: string
  name: string
  created_at: string
}

export interface CloudProjectSnapshot {
  saved_at: string
  stats?: { total?: number; sizeMb?: number; db?: string } | null
}

export interface CloudProject {
  id: string
  name: string
  db_name?: string | null
  folder_id?: string | null
  created_at: string
  snapshot: CloudProjectSnapshot | null
}

export interface DesktopApi {
  isDesktop: boolean
  engineStatus: () => Promise<EngineStatusInfo>
  startEngine: () => Promise<void>
  stopEngine: () => Promise<void>
  getConfig: () => Promise<Record<string, unknown>>
  setConfig: (patch: Record<string, unknown>) => Promise<Record<string, unknown>>
  onEngineStatus: (cb: (data: EngineStatusInfo) => void) => () => void
  dbList: () => Promise<DbListResult>
  dbSwitch: (name: string) => Promise<{ ok: boolean; db: string }>
  dbCreate: (name: string) => Promise<{ ok: boolean; db: string }>
  dbCreateCopy: (name: string, from: string) => Promise<{ ok: boolean; db: string }>
  dbDelete: (name: string) => Promise<{ ok: boolean }>
  dbExport: (toPath: string) => Promise<{ models: number; path: string }>
  dbImport: (zipPath: string, name: string) => Promise<{ total: number; failed: number; failures: string[] }>
  onDbProgress: (cb: (data: DbProgress) => void) => () => void
  onDbChanged: (cb: (data: { db: string }) => void) => () => void
  dialogSave: (opts?: { defaultName?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>
  dialogOpen: (opts?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string | null>
  dialogOpenMulti: (opts?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string[] | null>
  cloudProjectsList: () => Promise<CloudProject[]>
  cloudProjectsSave: (
    name: string,
    note?: string,
  ) => Promise<{ project_id: string; name: string; sizeMb: number; total: number }>
  cloudProjectsOpen: (
    projectId: string,
    dbName: string,
  ) => Promise<{ db: string; total: number; failed: number; failures: string[] }>
  cloudProjectsDelete: (projectId: string) => Promise<{ ok: boolean }>
  cloudFoldersList: () => Promise<CloudFolder[]>
  cloudFoldersCreate: (name: string) => Promise<CloudFolder>
  cloudFoldersRename: (id: string, name: string) => Promise<{ ok: boolean }>
  cloudFoldersDelete: (id: string) => Promise<{ ok: boolean }>
  cloudProjectsMove: (projectId: string, folderId: string | null) => Promise<{ ok: boolean }>
  aiReportNarrative: (payload: unknown) => Promise<{
    analysis?: string
    assumptions?: string[]
    limitations?: string[]
    recommendations?: string[]
  }>
  aiExtractInventory: (text: string, lang: string) => Promise<Record<string, any>>
  extractText: (path: string) => Promise<{ text: string; chars: number }>
  cloudReportSave: (reportData: Record<string, unknown>) => Promise<{ id: string | null; projectId: string | null }>
  cloudReportsList: () => Promise<
    Array<{
      id: string
      product_title: string | null
      total_co2eq: number | null
      report_data: Record<string, unknown> | null
      created_at: string | null
    }>
  >
  fileWrite: (path: string, content: string) => Promise<{ ok: boolean }>
  fileWriteBase64: (path: string, base64: string) => Promise<{ ok: boolean }>
  aiCalculate: (description: string, lang: string) => Promise<Record<string, unknown>>
  authLogin: (email: string, password: string) => Promise<{ email: string; user_id?: string }>
  checkUpdates: () => Promise<{ ok: boolean; version?: string | null; reason?: string }>
  appVersion: () => Promise<string>
  downloadUpdates: () => Promise<{ ok: boolean; reason?: string }>
  installUpdates: () => Promise<{ ok: boolean }>
  onUpdateEvent: (cb: (e: { type: string; payload: any }) => void) => () => void
  authGet: () => Promise<{ email: string; access_token: string; user_id?: string; expires_at?: number } | null>
  authLogout: () => Promise<boolean>
  winMinimize: () => Promise<void>
  winMaximize: () => Promise<void>
  winClose: () => Promise<void>
  winIsMaximized: () => Promise<boolean>
  newWindow: () => Promise<void>
  editAction: (op: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'delete' | 'selectall') => Promise<void>
  viewAction: (op: 'reload' | 'devtools' | 'zoomin' | 'zoomout' | 'zoom0' | 'fullscreen') => Promise<void>
  onWinMaximized: (cb: (maximized: boolean) => void) => () => void
  onMenuAction: (cb: (actionId: string) => void) => () => void
}

declare global {
  interface Window {
    desktop?: DesktopApi
  }
}

export {}
