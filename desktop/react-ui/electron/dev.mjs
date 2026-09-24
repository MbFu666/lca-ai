import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DEV_URL = 'http://localhost:5173'

const vite = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

async function waitFor(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) })
      if (res.ok) return true
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

let electron = null
try {
  if (!(await waitFor(DEV_URL))) {
    console.error('vite dev server did not come up on ' + DEV_URL)
    vite.kill()
    process.exit(1)
  }
  const electronPath = (await import('electron')).default
  electron = spawn(electronPath, ['.', '--remote-debugging-port=9223'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_START_URL: DEV_URL },
  })
  electron.on('exit', (code) => {
    vite.kill()
    process.exit(code ?? 0)
  })
} catch (e) {
  console.error(e)
  vite.kill()
  process.exit(1)
}

vite.on('exit', () => {
  if (electron) electron.kill()
  process.exit(0)
})
