import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'

/**
 * NudgeToast — tap-dismissible in-app toast stack.
 *
 * Driven by fresh `nudge` entries from useInbox. NOT a system notification.
 * Auto-dismisses after 8s per toast.
 */
export default function NudgeToast({ fresh }) {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    if (!fresh || fresh.length === 0) return
    const nudges = fresh.filter((e) => e.kind === 'nudge')
    if (nudges.length === 0) return
    setToasts((prev) => [...prev, ...nudges])
    const timers = nudges.map((n) => setTimeout(() => dismiss(n.id), 8000))
    return () => timers.forEach(clearTimeout)
  }, [fresh])

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id))

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(var(--tab-h) + var(--safe-b) + 16px)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 'min(92vw, 420px)',
        width: '100%',
        padding: '0 12px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            pointerEvents: 'auto',
            width: '100%', textAlign: 'left',
            padding: '12px 14px', borderRadius: 14,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-active)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            animation: 'fadeIn 0.25s ease-out',
          }}
        >
          <Icon icon={t.icon || 'mdi:bell-ring-outline'} width={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {t.title && <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{t.title}</p>}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {t.body || t.title}
            </p>
            {t.from?.name && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                from {t.from.name}
              </p>
            )}
          </div>
          <Icon icon="mdi:close" width={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </button>
      ))}
    </div>
  )
}
