import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'cloche'
  | 'notebook'
  | 'person'
  | 'send'
  | 'compass'
  | 'search'
  | 'mic'
  | 'diary'
  | 'user'
  | 'arrow-left'
  | 'clock'
  | 'flame'
  | 'leaf'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'chevron-right'
  | 'sparkles'
  | 'target'
  | 'calendar'
  | 'check'
  | 'close'
  | 'bag'
  | 'chef'
  | 'sliders'
  | 'camera'
  | 'refresh'
  | 'bolt'
  | 'scan'
  | 'heart'
  | 'play'

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }

  if (name === 'home')
    return <svg {...common}><path d="m4 10 8-6.5 8 6.5v8.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10Z" /><path d="M9.5 20.5v-6h5v6" /></svg>
  if (name === 'cloche')
    return <svg {...common}><path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 8V6M10 6h4M3 20h18" /></svg>
  if (name === 'notebook')
    return <svg {...common}><path d="M6.5 4h11A1.5 1.5 0 0 1 19 5.5v14A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-14A1.5 1.5 0 0 1 6.5 4Z" /><path d="M8 2v4M12 2v4M16 2v4M8.5 10h7M8.5 14h5" /></svg>
  if (name === 'person')
    return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20.5c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></svg>
  if (name === 'send')
    return <svg {...common}><path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" /></svg>
  if (name === 'compass')
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" /><circle cx="12" cy="12" r="1" /></svg>
  if (name === 'search')
    return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
  if (name === 'mic')
    return <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6" /></svg>
  if (name === 'diary')
    return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 3v18M11 8h5M11 12h5M11 16h3" /></svg>
  if (name === 'user')
    return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>
  if (name === 'arrow-left')
    return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>
  if (name === 'clock')
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  if (name === 'flame')
    return <svg {...common}><path d="M13.5 2.5c.4 3-1.2 4.1-2.3 5.4-1.3 1.5-2 2.8-1.2 4.8.4-1.8 1.5-2.5 2.7-3.6.6 2 2.7 3.4 2.7 6A3.4 3.4 0 0 1 12 18.5a3.4 3.4 0 0 1-3.4-3.4c0-.7.1-1.3.4-1.9-1.6 1.2-2.6 3-2.6 5A5.6 5.6 0 0 0 12 23a5.6 5.6 0 0 0 5.6-5.6c0-3.4-1.7-7.9-4.1-14.9Z" /></svg>
  if (name === 'leaf')
    return <svg {...common}><path d="M20 4C12 4 5 7 5 14c0 3 2 5 5 5 7 0 10-7 10-15Z" /><path d="M4 21c2-6 6-9 11-12" /></svg>
  if (name === 'plus') return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'minus') return <svg {...common}><path d="M5 12h14" /></svg>
  if (name === 'trash') return <svg {...common}><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>
  if (name === 'chevron-right') return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>
  if (name === 'sparkles')
    return <svg {...common}><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14ZM19 13l.7 1.8 1.8.7-1.8.7L19 18l-.7-1.8-1.8-.7 1.8-.7L19 13Z" /></svg>
  if (name === 'target')
    return <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
  if (name === 'calendar')
    return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18" /></svg>
  if (name === 'check') return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>
  if (name === 'close') return <svg {...common}><path d="m6 6 12 12M18 6 6 18" /></svg>
  if (name === 'bag')
    return <svg {...common}><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>
  if (name === 'chef')
    return <svg {...common}><path d="M7 10a4 4 0 1 1 2-7 4 4 0 0 1 7 2 3 3 0 0 1 1 5v9H7v-9ZM7 15h10" /></svg>
  if (name === 'sliders')
    return <svg {...common}><path d="M4 6h5M15 6h5M4 12h9M17 12h3M4 18h3M11 18h9" /><circle cx="12" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="9" cy="18" r="2" /></svg>
  if (name === 'camera')
    return <svg {...common}><path d="M4 7h4l1.5-2h5L16 7h4v12H4V7Z" /><circle cx="12" cy="13" r="3.5" /></svg>
  if (name === 'refresh')
    return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M18.2 9A7 7 0 0 0 6 6.5L4 9M5.8 15A7 7 0 0 0 18 17.5l2-2.5" /></svg>
  if (name === 'bolt')
    return <svg {...common}><path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" /></svg>
  if (name === 'scan')
    return <svg {...common}><path d="M8 3H4a1 1 0 0 0-1 1v4M16 3h4a1 1 0 0 1 1 1v4M8 21H4a1 1 0 0 1-1-1v-4M16 21h4a1 1 0 0 0 1-1v-4M7 12h10" /></svg>
  if (name === 'heart')
    return <svg {...common}><path d="M20.8 4.9a5.5 5.5 0 0 0-7.8 0L12 6l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.3 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
  if (name === 'play')
    return <svg {...common}><path d="m9 7 8 5-8 5V7Z" /></svg>
  return null
}
