import { useEffect, useState } from 'react'

export function WindowControls() {
  const [max, setMax] = useState(false)
  const desktop = window.desktop
  useEffect(() => {
    if (!desktop) return
    desktop.winIsMaximized().then(setMax).catch(() => undefined)
    return desktop.onWinMaximized(setMax)
  }, [desktop])
  if (!desktop) return null
  return (
    <div className="no-drag flex items-stretch h-full ml-1">
      <button onClick={() => desktop.winMinimize()} title="Minimize" className="wc-btn">
        ─
      </button>
      <button onClick={() => desktop.winMaximize()} title={max ? 'Restore' : 'Maximize'} className="wc-btn">
        {max ? '❐' : '□'}
      </button>
      <button onClick={() => desktop.winClose()} title="Close" className="wc-btn wc-close">
        ×
      </button>
    </div>
  )
}
