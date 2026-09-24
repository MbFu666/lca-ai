import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const STYLES: Record<Variant, string> = {
  primary: 'bg-graphite text-paper hover:bg-graphite/85 disabled:opacity-40',
  ghost: 'bg-transparent border border-line text-graphite hover:bg-paper-2 disabled:opacity-40',
  danger: 'bg-e-4 text-white hover:bg-e-5 disabled:opacity-40',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`px-3 py-1.5 text-[13px] font-sans uppercase tracking-wide cursor-pointer transition-colors disabled:cursor-default ${STYLES[variant]} ${className}`}
      {...props}
    />
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-graphite-mid text-[13px]">
      <span className="inline-block w-3.5 h-3.5 border-2 border-line border-t-graphite animate-spin" />
      {label}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-e-4/40 bg-e-4/5 p-3 text-[13px]">
      <div className="text-e-ink font-medium mb-1">Error</div>
      <div className="text-graphite-mid font-mono text-[12px] break-all">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-[12px] underline cursor-pointer">
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-graphite-soft text-[14px]">
      {children}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] gap-3 py-1.5 items-baseline">
      <div className="text-[12px] font-sans uppercase tracking-wide text-graphite-mid">{label}</div>
      <div className="text-[14px]">{children}</div>
    </div>
  )
}
