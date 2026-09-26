import type { SVGProps } from 'react'

/** Monochrome 16px stroke icons (OpenCode-like crisp look), color = currentColor. */
function I({ children, ...p }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  )
}

export const IconMenu = () => (
  <I>
    <path d="M3 5h10M3 8h10M3 11h10" />
  </I>
)

export const IconGridPlus = () => (
  <I>
    <rect x="2.2" y="2.2" width="4.6" height="4.6" rx="0.8" />
    <rect x="9.2" y="2.2" width="4.6" height="4.6" rx="0.8" />
    <rect x="2.2" y="9.2" width="4.6" height="4.6" rx="0.8" />
    <path d="M11.5 9.4v4.4M9.3 11.6h4.4" />
  </I>
)

export const IconSearch = () => (
  <I>
    <circle cx="6.8" cy="6.8" r="4.1" />
    <path d="M9.9 9.9 14 14" />
  </I>
)

export const IconHistory = () => (
  <I>
    <circle cx="8" cy="8" r="5.4" />
    <path d="M8 4.9V8l2.2 2.2" />
  </I>
)

export const IconSplit = () => (
  <I>
    <rect x="1.8" y="2.6" width="12.4" height="10.8" rx="1" />
    <path d="M8 2.6v10.8" />
  </I>
)

export const IconSidebar = () => (
  <I>
    <rect x="1.8" y="2.6" width="12.4" height="10.8" rx="1" />
    <path d="M6.2 2.6v10.8" />
  </I>
)

export const IconAi = () => (
  <I>
    <path d="M8 1.6 9.7 6.3 14.4 8 9.7 9.7 8 14.4 6.3 9.7 1.6 8 6.3 6.3Z" />
  </I>
)

export const IconScenario = () => (
  <I>
    <path d="M8 1.8 14 8 8 14.2 2 8Z" />
    <path d="M8 5.4 10.6 8 8 10.6 5.4 8Z" />
  </I>
)

export const IconWizard = () => (
  <I>
    <path d="M2.6 8 8 2.8 13.4 8" />
    <path d="M4.2 7v6.2h7.6V7" />
    <path d="M6.6 13.2v-3.4h2.8v3.4" />
  </I>
)

export const IconReport = () => (
  <I>
    <rect x="3.2" y="1.8" width="9.6" height="12.4" rx="1" />
    <path d="M5.4 5h5.2M5.4 7.6h5.2M5.4 10.2h3.4" />
  </I>
)

export const IconAutoFill = () => (
  <I>
    <path d="M8 1.8v6.4M5.4 5.8 8 8.4l2.6-2.6" />
    <path d="M2.6 10.4v3.8h10.8v-3.8" />
  </I>
)

export const IconCloud = () => (
  <I>
    <path d="M4.6 12.6a3 3 0 0 1 .3-6 4.4 4.4 0 0 1 8.5 1.2 2.6 2.6 0 0 1-.6 4.8Z" />
  </I>
)

export const IconDb = () => (
  <I>
    <ellipse cx="8" cy="3.8" rx="5.2" ry="2" />
    <path d="M2.8 3.8v8.4c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2V3.8" />
    <path d="M2.8 8c0 1.1 2.3 2 5.2 2s5.2-.9 5.2-2" />
  </I>
)

export const IconParams = () => (
  <I>
    <path d="M2.4 4.8h11.2M2.4 11.2h11.2" />
    <circle cx="6" cy="4.8" r="1.7" fill="var(--color-paper-2)" />
    <circle cx="10" cy="11.2" r="1.7" fill="var(--color-paper-2)" />
  </I>
)
