import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import { formatTime } from '../utils/dateFormat'

/**
 * Passive banner shown to an employee after a manager performed a
 * live_preview on their account. Dismissible, non-blocking.
 *
 * Driven by fresh `live_preview` inbox entries; we dedupe by id so it
 * doesn't re-appear after dismiss.
 */
export default function LivePreviewBanner({ fresh }) {
  const [active, setActive] = useState(null)
  const [dismissedIds, setDismissedIds] = useState(() => new Set())

  useEffect(() => {
    if (!fresh || fresh.length === 0) return
    const previews = fresh.filter((e) => e.kind === 'live_preview' && !dismissedIds.has(e.id))
    if (previews.length === 0) return
    // Show the most recent one.
    setActive(previews[previews.length - 1])
  }, [fresh, dismissedIds])

  if (!active) return null

  const dismiss = () => {
    setDismissedIds((prev) => {
      const next = new Set(prev)
      next.add(active.id)
      return next
    })
    setActive(null)
  }

  const when = active.created_at ? formatTime(active.created_at) : 'just now'
  const who = active.from?.name || 'A manager'

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 45,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'rgba(167, 139, 250, 0.1)',
        borderBottom: '1px solid rgba(167, 139, 250, 0.35)',
        color: '#c4b5fd',
        fontSize: 12,
        fontWeight: 600,
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      <Icon icon="mdi:eye-outline" width={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {who} viewed your screen at {when}
      </span>
      <button
        onClick={dismiss}
        style={{
          minWidth: 28, minHeight: 28,
          background: 'transparent', border: 'none',
          color: '#c4b5fd', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label="Dismiss"
      >
        <Icon icon="mdi:close" width={16} />
      </button>
    </div>
  )
}
