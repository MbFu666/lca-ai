const { app, BrowserWindow, ipcMain, Menu, shell, dialog, safeStorage } = require('electron')
const { spawn, spawnSync } = require('child_process')
const path = require('path')
const os = require('os')
const fs = require('fs')
const http = require('http')

const PORT = 8080
const DEV_URL = process.env.ELECTRON_START_URL || process.env.VITE_DEV_SERVER_URL

const authPath = () => path.join(app.getPath('userData'), 'auth.json')

function saveAuth(data) {
  const plain = JSON.stringify(data)
  if (safeStorage.isEncryptionAvailable()) {
    const enc = safeStorage.encryptString(plain).toString('base64')
    fs.writeFileSync(authPath(), JSON.stringify({ v: 1, enc }))
  } else {
    fs.writeFileSync(authPath(), plain)
  }
}

function loadAuth() {
  try {
    const raw = JSON.parse(fs.readFileSync(authPath(), 'utf8'))
    if (raw && typeof raw.enc === 'string') {
      if (!safeStorage.isEncryptionAvailable()) return null
      return JSON.parse(safeStorage.decryptString(Buffer.from(raw.enc, 'base64')))
    }
    return raw
  } catch {
    return null
  }
}

const SUPABASE_URL = 'https://pbisngkepszwzzjivxus.supabase.co'
const SUPABASE_APIKEY = 'sb_publishable_FzDhBqHiQfygA-L695gIPg_R1vnjhS2'

function requireAuth() {
  const auth = loadAuth()
  if (!auth?.access_token) throw new Error('LOGIN_REQUIRED')
  return auth
}

function sbHeaders(auth, extra) {
  return {
    apikey: SUPABASE_APIKEY,
    Authorization: `Bearer ${auth.access_token}`,
    'Content-Type': 'application/json',
    ...(extra ?? {}),
  }
}

async function sbFetch(url, auth, opts) {
  const r = await fetch(url, { ...opts, headers: sbHeaders(auth, opts?.headers) })
  if (r.status === 401) throw new Error('TOKEN_EXPIRED')
  if (!r.ok) throw new Error(`Supabase HTTP ${r.status}: ${(await r.text().catch(() => '')).slice(0, 200)}`)
  return r
}

async function sbJson(url, auth, opts) {
  return sbFetch(url, auth, opts).then((r) => r.json())
}

function bundledJavaPath() {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'engine', 'jre', 'bin', 'java.exe'),
    path.join(__dirname, '..', 'release', 'win-unpacked', 'resources', 'engine', 'jre', 'bin', 'java.exe'),
  ]
  return candidates.find((p) => p && fs.existsSync(p)) ?? null
}

function bundledLibsPath() {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'engine', 'libs'),
    path.join(__dirname, '..', 'release', 'win-unpacked', 'resources', 'engine', 'libs'),
  ]
  return candidates.find((p) => p && fs.existsSync(p)) ?? null
}

const DEFAULT_CONFIG = {
  javaExe: bundledJavaPath() ?? 'D:\\openLCA\\jre\\bin\\java.exe',
  libsDir: bundledLibsPath() ?? 'D:\\openLCA\\plugins\\olca-app_2.6.1\\libs',
  dataDir: path.join(os.homedir(), 'openLCA-data-1.4'),
  db: 'tiangong',
  baseDb: 'tiangong',
  xmx: '3584M',
  threads: 4,
  autoStart: true,
}

const EXPORT_TYPES = [
  'UnitGroup',
  'FlowProperty',
  'Currency',
  'Location',
  'Actor',
  'Source',
  'DQSystem',
  'Parameter',
  'SocialIndicator',
  'Flow',
  'ImpactCategory',
  'ImpactMethod',
  'Process',
  'ProductSystem',
  'Result',
]

const IMPORT_ORDER = [
  'UnitGroup',
  'FlowProperty',
  'Currency',
  'Location',
  'Actor',
  'Source',
  'DQSystem',
  'Parameter',
  'SocialIndicator',
  'Flow',
  'ImpactCategory',
  'ImpactMethod',
  'Process',
  'ProductSystem',
  'Result',
]

let win = null
let engine = null
let engineState = 'stopped'
let engineMessage = ''
let weSpawned = false
let busy = false
let intentionalStop = false

function configPath() {
  return path.join(app.getPath('userData'), 'engine-config.json')
}

function loadConfig() {
  let cfg
  try {
    cfg = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath(), 'utf8')) }
  } catch {
    cfg = { ...DEFAULT_CONFIG }
  }
  const bj = bundledJavaPath()
  const bl = bundledLibsPath()
  if (!fs.existsSync(cfg.javaExe) && bj) cfg.javaExe = bj
  if (!fs.existsSync(cfg.libsDir) && bl) cfg.libsDir = bl
  return cfg
}

function saveConfig(cfg) {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2))
}

function rpc(method, params, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params })
    const req = http.request(
      {
        host: '127.0.0.1',
        port: PORT,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: timeoutMs,
      },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => {
          try {
            const j = JSON.parse(data)
            if (j.error) reject(new Error(j.error.message || `RPC error ${j.error.code}`))
            else resolve(j.result)
          } catch (e) {
            reject(new Error(`bad RPC response: ${String(e)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('RPC timeout'))
    })
    req.write(body)
    req.end()
  })
}

async function pingEngine() {
  try {
    await rpc('data/get/descriptors', { '@type': 'UnitGroup' }, 2500)
    return true
  } catch {
    return false
  }
}

function broadcast() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('engine:status', { state: engineState, message: engineMessage, managed: weSpawned })
  }
}

function setState(state, message = '') {
  engineState = state
  engineMessage = message
  broadcast()
}

function dbChanged() {
  if (win && !win.isDestroyed()) win.webContents.send('db:changed', { db: loadConfig().db })
}

function dbProgress(payload) {
  if (win && !win.isDestroyed()) win.webContents.send('db:progress', payload)
}

async function startEngine() {
  if (engineState === 'starting' || engineState === 'online') return
  intentionalStop = false
  const cfg = loadConfig()
  if (await pingEngine()) {
    weSpawned = false
    setState('online', 'external server on :8080')
    return
  }
  if (!fs.existsSync(cfg.javaExe)) {
    setState('error', `java not found: ${cfg.javaExe}`)
    return
  }
  if (!fs.existsSync(cfg.libsDir)) {
    setState('error', `libs not found: ${cfg.libsDir}`)
    return
  }
  const jars = fs
    .readdirSync(cfg.libsDir)
    .filter((f) => f.endsWith('.jar'))
    .map((f) => path.join(cfg.libsDir, f))
  if (jars.length === 0) {
    setState('error', `no jars in ${cfg.libsDir}`)
    return
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    setState('starting', attempt === 1 ? 'spawning java…' : `retry ${attempt}…`)
    try {
      engine = spawn(
        cfg.javaExe,
        [
          `-Xmx${cfg.xmx}`,
          '-cp',
          jars.join(';'),
          'lcaai.Main',
          '-timeout',
          '1440',
          '-threads',
          String(cfg.threads ?? 4),
          '-data',
          cfg.dataDir,
          '-db',
          cfg.db,
        ],
        { windowsHide: true },
      )
      weSpawned = true
      engine.stdout.on('data', () => {})
      engine.stderr.on('data', () => {})
      engine.on('exit', (code) => {
        engine = null
        weSpawned = false
        if (intentionalStop) return
        if (engineState === 'starting' || engineState === 'online') {
          setState(code === 0 ? 'stopped' : 'error', `java exited (${code})`)
        }
      })
      const deadline = Date.now() + 180000
      let outcome = 'timeout'
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500))
        if (intentionalStop) return
        if (await pingEngine()) {
          outcome = 'online'
          break
        }
        if (!engine) {
          outcome = 'dead'
          break
        }
      }
      if (outcome === 'online') {
        setState('online', `ready · db=${loadConfig().db}`)
        return
      }
      if (intentionalStop) return
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 3000))
      }
    } catch (e) {
      setState('error', String(e))
      return
    }
  }
  setState('error', 'не удалось запустить движок (3 попытки)')
}

function killEngineTree() {
  if (engine && engine.pid) {
    spawnSync('taskkill', ['/pid', String(engine.pid), '/T', '/F'], { windowsHide: true })
  }
  engine = null
}

async function stopEngine() {
  if (weSpawned) {
    intentionalStop = true
    killEngineTree()
    weSpawned = false
    setState('stopped', 'stopped')
    for (let i = 0; i < 20; i++) {
      if (!(await pingEngine())) break
      await new Promise((r) => setTimeout(r, 500))
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
}

function databasesDir() {
  return path.join(loadConfig().dataDir, 'databases')
}

function isDerbyFolder(p) {
  try {
    return (
      fs.existsSync(path.join(p, 'service.properties')) &&
      fs.existsSync(path.join(p, 'seg0')) &&
      fs.existsSync(path.join(p, 'log'))
    )
  } catch {
    return false
  }
}

function dirSizeMb(p) {
  try {
    let total = 0
    const stack = [p]
    while (stack.length > 0) {
      const cur = stack.pop()
      for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
        const full = path.join(cur, e.name)
        if (e.isDirectory()) stack.push(full)
        else if (e.isFile()) total += fs.statSync(full).size
      }
    }
    return Math.round((total / (1024 * 1024)) * 10) / 10
  } catch {
    return 0
  }
}

function validDbName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9_\-]{1,64}$/.test(name)
}

function listDatabases() {
  const cfg = loadConfig()
  const dir = databasesDir()
  const names = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => isDerbyFolder(path.join(dir, n)))
    : []
  return names.map((n) => ({
    name: n,
    active: n === cfg.db,
    isBase: n === cfg.baseDb,
    sizeMb: dirSizeMb(path.join(dir, n)),
  }))
}

async function requireManagedEngine() {
  if (!weSpawned) {
    if (await pingEngine()) {
      throw new Error('Внешний сервер на :8080 мешает переключению БД. Закройте его.')
    }
  }
}

async function switchDb(name) {
  if (!validDbName(name)) throw new Error('Недопустимое имя БД (A-Z, a-z, 0-9, _, -)')
  await requireManagedEngine()
  await stopEngine()
  const cfg = loadConfig()
  cfg.db = name
  saveConfig(cfg)
  await startEngine()
  if (engineState !== 'online') throw new Error(engineMessage || 'Движок не запустился')
  dbChanged()
}

async function exportActiveDb(toPath) {
  if (engineState !== 'online') throw new Error('Движок не подключён')
  const models = []
  for (const type of EXPORT_TYPES) {
    try {
      const list = await rpc('data/get/descriptors', { '@type': type })
      const arr = Array.isArray(list) ? list : list
        ? [list]
        : []
      for (const d of arr) models.push({ '@type': type, '@id': d['@id'] })
    } catch {
      // type not supported — skip
    }
  }
  if (models.length === 0) throw new Error('В базе нет данных для экспорта')
  dbProgress({ phase: 'export', done: 0, total: models.length, note: 'writing zip…' })
  const res = await rpc('export/json-ld', { path: toPath, models }, 1800000)
  dbProgress({ phase: 'export', done: models.length, total: models.length, note: String(res ?? 'done') })
  return { models: models.length, path: toPath }
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  let r = spawnSync('tar', ['-xf', zipPath, '-C', destDir], { windowsHide: true })
  if (r.status === 0) return
  r = spawnSync(
    'powershell',
    ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force`],
    { windowsHide: true },
  )
  if (r.status !== 0) {
    throw new Error(`Не удалось распаковать zip: ${(r.stderr || '').toString().slice(0, 300)}`)
  }
}

function collectJsonFiles(rootDir) {
  const out = []
  const stack = [rootDir]
  while (stack.length > 0) {
    const cur = stack.pop()
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, e.name)
      if (e.isDirectory()) stack.push(full)
      else if (e.isFile() && e.name.endsWith('.json')) out.push(full)
    }
  }
  return out
}

async function importDb(zipPath, name) {
  if (!validDbName(name)) throw new Error('Недопустимое имя БД (A-Z, a-z, 0-9, _, -)')
  const dir = path.join(databasesDir(), name)
  if (fs.existsSync(dir)) throw new Error(`База "${name}" уже существует`)
  if (!fs.existsSync(zipPath)) throw new Error('Файл не найден')

  await switchDb(name)

  const tmp = path.join(app.getPath('temp'), `lca-import-${Date.now()}`)
  dbProgress({ phase: 'unpack', done: 0, total: 1, note: zipPath })
  extractZip(zipPath, tmp)

  const files = collectJsonFiles(tmp)
  const buckets = new Map()
  for (const f of files) {
    try {
      const head = fs.readFileSync(f, 'utf8')
      const m = head.match(/"@type"\s*:\s*"([A-Za-z]+)"/)
      if (!m) continue
      if (!buckets.has(m[1])) buckets.set(m[1], [])
      buckets.get(m[1]).push({ file: f, json: head })
    } catch {
      // skip unreadable
    }
  }

  const ordered = []
  for (const type of IMPORT_ORDER) {
    for (const item of buckets.get(type) ?? []) ordered.push({ type, ...item })
  }
  for (const [type, items] of buckets) {
    if (!IMPORT_ORDER.includes(type)) for (const item of items) ordered.push({ type, ...item })
  }

  const total = ordered.length
  if (total === 0) throw new Error('В zip не найдено JSON-LD сущностей')

  let done = 0
  let failed = 0
  const failures = []
  const CONCURRENCY = 4
  let idx = 0

  async function worker() {
    while (idx < ordered.length) {
      const i = idx++
      const item = ordered[i]
      try {
        await rpc('data/put', JSON.parse(item.json), 60000)
      } catch (e) {
        failed++
        if (failures.length < 20) failures.push(`${item.type}: ${String(e instanceof Error ? e.message : e).slice(0, 120)}`)
      }
      done++
      if (done % 50 === 0 || done === total) {
        dbProgress({ phase: 'import', done, total, note: item.type })
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  fs.rmSync(tmp, { recursive: true, force: true })
  dbProgress({ phase: 'done', done: total, total, note: `imported ${total - failed}/${total}` })
  dbChanged()
  return { total, failed, failures }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'LCA·AI Studio',
    icon: path.join(__dirname, '..', 'buildResources', 'icon.ico'),
    backgroundColor: '#17191c',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  Menu.setApplicationMenu(null)
  win.once('ready-to-show', () => win.show())
  if (DEV_URL) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('closed', () => {
    win = null
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    createWindow()

    ipcMain.handle('engine:start', () => startEngine())
    ipcMain.handle('engine:stop', () => stopEngine())
    ipcMain.handle('engine:status', () => ({ state: engineState, message: engineMessage, managed: weSpawned }))
    ipcMain.handle('engine:config', () => loadConfig())
    ipcMain.handle('engine:config-set', (_e, patch) => {
      const cfg = { ...loadConfig(), ...patch }
      saveConfig(cfg)
      return cfg
    })

    ipcMain.handle('db:list', () => ({ current: loadConfig().db, databases: listDatabases() }))
    ipcMain.handle('db:switch', async (_e, name) => {
      if (busy) throw new Error('Уже выполняется операция с БД')
      busy = true
      try {
        await switchDb(name)
        return { ok: true, db: name }
      } finally {
        busy = false
      }
    })
    ipcMain.handle('db:create', async (_e, name) => {
      if (busy) throw new Error('Уже выполняется операция с БД')
      if (!validDbName(name)) throw new Error('Недопустимое имя БД (A-Z, a-z, 0-9, _, -)')
      if (fs.existsSync(path.join(databasesDir(), name))) throw new Error(`База "${name}" уже существует`)
      busy = true
      try {
        await switchDb(name)
        return { ok: true, db: name }
      } finally {
        busy = false
      }
    })
    ipcMain.handle('db:create-copy', async (_e, { name, from }) => {
      if (busy) throw new Error('Уже выполняется операция с БД')
      if (!validDbName(name)) throw new Error('Недопустимое имя БД (A-Z, a-z, 0-9, _, -)')
      const src = path.join(databasesDir(), from)
      const dst = path.join(databasesDir(), name)
      if (!isDerbyFolder(src)) throw new Error(`Исходная база "${from}" не найдена`)
      if (fs.existsSync(dst)) throw new Error(`База "${name}" уже существует`)
      busy = true
      try {
        await requireManagedEngine()
        await stopEngine()
        fs.cpSync(src, dst, { recursive: true })
        for (const lockName of ['db.lck']) {
          const lockFile = path.join(dst, lockName)
          if (fs.existsSync(lockFile)) fs.rmSync(lockFile, { force: true })
        }
        await switchDb(name)
        return { ok: true, db: name }
      } finally {
        busy = false
      }
    })
    ipcMain.handle('db:delete', async (_e, name) => {
      const cfg = loadConfig()
      if (name === cfg.baseDb) throw new Error('Базовую базу удалить нельзя')
      if (name === cfg.db) throw new Error('Активную базу удалить нельзя — сначала переключитесь')
      const dir = path.join(databasesDir(), name)
      if (!isDerbyFolder(dir)) throw new Error(`База "${name}" не найдена`)
      fs.rmSync(dir, { recursive: true, force: true })
      return { ok: true }
    })
    ipcMain.handle('db:export', async (_e, toPath) => {
      if (busy) throw new Error('Уже выполняется операция с БД')
      busy = true
      try {
        return await exportActiveDb(toPath)
      } finally {
        busy = false
      }
    })
    ipcMain.handle('db:import', async (_e, { zipPath, name }) => {
      if (busy) throw new Error('Уже выполняется операция с БД')
      busy = true
      try {
        return await importDb(zipPath, name)
      } finally {
        busy = false
      }
    })

    ipcMain.handle('dialog:save', async (_e, opts) => {
      const r = await dialog.showSaveDialog(win, {
        defaultPath: opts?.defaultName ?? 'database.zip',
        filters: opts?.filters ?? [{ name: 'ZIP', extensions: ['zip'] }],
      })
      return r.canceled ? null : r.filePath
    })
    ipcMain.handle('dialog:open', async (_e, opts) => {
      const r = await dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: opts?.filters ?? [{ name: 'ZIP', extensions: ['zip'] }],
      })
      return r.canceled ? null : r.filePaths[0]
    })

    ipcMain.handle('dialog:open-multi', async (_e, opts) => {
      const r = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: opts?.filters ?? [{ name: 'CSV', extensions: ['csv'] }],
      })
      return r.canceled ? null : r.filePaths
    })

    ipcMain.handle('file:write', (_e, { path: p, content }) => {
      if (typeof p !== 'string' || typeof content !== 'string') throw new Error('invalid args')
      fs.writeFileSync(p, content, 'utf8')
      return { ok: true }
    })

    ipcMain.handle('file:write-base64', (_e, { path: p, base64 }) => {
      if (typeof p !== 'string' || typeof base64 !== 'string') throw new Error('invalid args')
      fs.writeFileSync(p, Buffer.from(base64, 'base64'))
      return { ok: true }
    })

    ipcMain.handle('auth:login', async (_e, { email, password }) => {
      const resp = await fetch(
        'https://pbisngkepszwzzjivxus.supabase.co/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: 'sb_publishable_FzDhBqHiQfygA-L695gIPg_R1vnjhS2',
          },
          body: JSON.stringify({ email, password }),
        },
      )
      const data = await resp.json()
      if (!resp.ok) {
        throw new Error(data.error_description || data.error || 'login failed')
      }
      saveAuth({
        email,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user_id: data.user?.id,
        expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
      })
      return { email, user_id: data.user?.id }
    })

    ipcMain.handle('auth:get', () => loadAuth())

    ipcMain.handle('auth:logout', () => {
      fs.rmSync(authPath(), { force: true })
      return true
    })

    ipcMain.handle('ai:calculate', async (_e, { description, lang }) => {
      const auth = loadAuth()
      if (!auth?.access_token) throw new Error('LOGIN_REQUIRED')

      const langName = lang === 'ru' ? 'Russian' : lang === 'zh' ? 'Chinese' : 'English'
      const systemPrompt = `LCA expert (ISO 14067). Reply with VALID JSON ONLY in ${langName}. Be concise, minimal reasoning. If input is not a product/material/process -> {"error":"not_lca","message":"..."}. Else schema: {"product_title":str,"functional_unit":str,"system_boundary":str,"method":str,"region":str,"total_co2eq":num,"stages":[{"name":str,"co2eq":num,"share_pct":num,"description":str,"key_inputs":[str],"factor_source":str,"sub_processes":[{"name":str,"amount":num,"unit":str,"factor":num,"factor_unit":str,"factor_source":str,"co2eq":num}]}]}. 5 stages, 2 sub_processes each, share_pct sums to 100, strings single-line, fit 8000 tokens.`

      const resp = await fetch('https://pbisngkepszwzzjivxus.supabase.co/functions/v1/lca-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.access_token}`,
        },
        body: JSON.stringify({
          model: 'deepseek-v4-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: description },
          ],
          max_tokens: 16000,
          temperature: 0.2,
          stream: false,
          response_format: { type: 'json_object' },
        }),
      })
      if (resp.status === 401) throw new Error('TOKEN_EXPIRED')
      if (resp.status === 429) throw new Error('RATE_LIMIT')
      if (!resp.ok) throw new Error(`proxy HTTP ${resp.status}`)
      const data = await resp.json()
      const text = data?.choices?.[0]?.message?.content ?? ''
      if (!text) throw new Error('EMPTY_RESPONSE')

      const first = text.indexOf('{')
      const last = text.lastIndexOf('}')
      if (first < 0 || last < 0) throw new Error('BAD_JSON')
      let body = text.slice(first, last + 1)
      try {
        return JSON.parse(body)
      } catch {
        const open = body.split('{').length - body.split('}').length
        const openBr = body.split('[').length - body.split(']').length
        body += ']'.repeat(Math.max(0, openBr)) + '}'.repeat(Math.max(0, open))
        return JSON.parse(body)
      }
    })

    ipcMain.handle('cloud:projects-list', async () => {
      const auth = requireAuth()
      const projects = await sbJson(
        `${SUPABASE_URL}/rest/v1/user_projects?select=*&order=created_at.desc`,
        auth,
      )
      const snaps = await sbJson(
        `${SUPABASE_URL}/rest/v1/project_snapshots?select=project_id,created_at,stats&order=version.desc`,
        auth,
      )
      const byProject = new Map()
      for (const s of snaps) {
        if (!byProject.has(s.project_id)) byProject.set(s.project_id, { saved_at: s.created_at, stats: s.stats })
      }
      return projects.map((p) => ({ ...p, snapshot: byProject.get(p.id) ?? null }))
    })

    ipcMain.handle('cloud:projects-save', async (_e, { name, note }) => {
      const auth = requireAuth()
      if (engineState !== 'online') throw new Error('Движок не подключён')
      const cfg = loadConfig()
      const entities = {}
      const stats = { db: cfg.db, types: {}, total: 0 }
      for (const type of EXPORT_TYPES) {
        try {
          const list = await rpc('data/get/all', { '@type': type }, 600000)
          const arr = Array.isArray(list) ? list : list ? [list] : []
          if (arr.length > 0) {
            entities[type] = arr
            stats.types[type] = arr.length
            stats.total += arr.length
          }
        } catch {
          // тип не поддерживается — пропускаем
        }
      }
      if (stats.total === 0) throw new Error('В базе нет сущностей')
      const sizeMb = Math.round((JSON.stringify(entities).length / 1048576) * 10) / 10
      stats.sizeMb = sizeMb
      if (sizeMb > 50) throw new Error('База слишком большая для облака (> 50 МБ)')

      const existing = await sbJson(
        `${SUPABASE_URL}/rest/v1/user_projects?name=eq.${encodeURIComponent(name)}&select=*`,
        auth,
      )
      const project =
        existing[0] ??
        (
          await sbJson(`${SUPABASE_URL}/rest/v1/user_projects`, auth, {
            method: 'POST',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ user_id: auth.user_id, name, db_name: cfg.db }),
          })
        )[0]

      await sbFetch(
        `${SUPABASE_URL}/rest/v1/project_snapshots?project_id=eq.${project.id}`,
        auth,
        { method: 'DELETE' },
      )
      await sbFetch(`${SUPABASE_URL}/rest/v1/project_snapshots`, auth, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          project_id: project.id,
          user_id: auth.user_id,
          version: 1,
          entities,
          stats,
          note: note ?? null,
        }),
      })
      return { project_id: project.id, name: project.name, sizeMb, total: stats.total }
    })

    ipcMain.handle('cloud:projects-open', async (_e, { projectId, dbName }) => {
      const auth = requireAuth()
      if (busy) throw new Error('Уже выполняется операция с БД')
      const snaps = await sbJson(
        `${SUPABASE_URL}/rest/v1/project_snapshots?select=entities,stats&project_id=eq.${projectId}&order=version.desc&limit=1`,
        auth,
      )
      if (!snaps.length) throw new Error('Снимок не найден')
      const snap = snaps[0]
      const entities = snap.entities ?? {}

      const name = String(dbName ?? '').trim()
      if (!validDbName(name)) throw new Error('Недопустимое имя БД (A-Z, a-z, 0-9, _, -)')
      if (fs.existsSync(path.join(databasesDir(), name))) throw new Error(`База "${name}" уже существует`)

      busy = true
      try {
        dbProgress({ phase: 'unpack', done: 0, total: 1, note: name })
        await switchDb(name)

        const ordered = []
        for (const type of IMPORT_ORDER) {
          for (const e of entities[type] ?? []) ordered.push(e)
        }
        for (const [type, arr] of Object.entries(entities)) {
          if (!IMPORT_ORDER.includes(type)) for (const e of arr) ordered.push(e)
        }

        const total = ordered.length
        if (total === 0) throw new Error('В снимке нет сущностей')
        let done = 0
        let failed = 0
        const failures = []
        let idx = 0
        const CONCURRENCY = 4
        async function worker() {
          while (idx < ordered.length) {
            const i = idx++
            const item = ordered[i]
            try {
              await rpc('data/put', item, 60000)
            } catch (e) {
              failed++
              if (failures.length < 20)
                failures.push(`${item?.['@type']}: ${String(e instanceof Error ? e.message : e).slice(0, 120)}`)
            }
            done++
            if (done % 50 === 0 || done === total) {
              dbProgress({ phase: 'import', done, total, note: item?.['@type'] ?? '' })
            }
          }
        }
        await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
        dbProgress({ phase: 'done', done: total, total, note: `imported ${total - failed}/${total}` })
        dbChanged()
        return { db: name, total, failed, failures }
      } finally {
        busy = false
      }
    })

    ipcMain.handle('cloud:projects-delete', async (_e, projectId) => {
      const auth = requireAuth()
      await sbFetch(`${SUPABASE_URL}/rest/v1/user_projects?id=eq.${projectId}`, auth, {
        method: 'DELETE',
      })
      return { ok: true }
    })

    ipcMain.handle('cloud:folders-list', async () => {
      const auth = requireAuth()
      return await sbJson(
        `${SUPABASE_URL}/rest/v1/project_folders?select=*&order=created_at`,
        auth,
      )
    })

    ipcMain.handle('cloud:folders-create', async (_e, { name }) => {
      const auth = requireAuth()
      const r = await sbJson(`${SUPABASE_URL}/rest/v1/project_folders`, auth, {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ user_id: auth.user_id, name }),
      })
      return r[0]
    })

    ipcMain.handle('cloud:folders-rename', async (_e, { id, name }) => {
      const auth = requireAuth()
      await sbFetch(`${SUPABASE_URL}/rest/v1/project_folders?id=eq.${id}`, auth, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ name }),
      })
      return { ok: true }
    })

    ipcMain.handle('cloud:folders-delete', async (_e, id) => {
      const auth = requireAuth()
      await sbFetch(`${SUPABASE_URL}/rest/v1/project_folders?id=eq.${id}`, auth, {
        method: 'DELETE',
      })
      return { ok: true }
    })

    ipcMain.handle('cloud:projects-move', async (_e, { projectId, folderId }) => {
      const auth = requireAuth()
      await sbFetch(`${SUPABASE_URL}/rest/v1/user_projects?id=eq.${projectId}`, auth, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ folder_id: folderId || null }),
      })
      return { ok: true }
    })

    if (loadConfig().autoStart) startEngine()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  app.quit()
})

app.on('before-quit', () => {
  if (weSpawned) killEngineTree()
})
