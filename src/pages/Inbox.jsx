import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { broadcastApi } from '../api/endpoints'
import useInboxStore from '../stores/useInboxStore'
import { glassStyle } from '../components/GlassCard'
import { relativeTime } from '../utils/dateFormat'

/**
 * Inbox page — single renderer for every entry kind.
 *
 * Filter chips: All / Broadcasts / Direct / Nudges / Live preview.
 * Urgent entries get a red left-border. Read entries dim to muted text.
 */

const FILTERS = [
  { id: 'all',          label: 'All',          kinds: null },
  { id: 'broadcast',    label: 'Announcements', kinds: ['broadcast'] },
  { id: 'dm',           label: 'Direct',        kinds: ['dm'] },
  { id: 'nudge',        label: 'Nudges',        kinds: ['nudge'] },
  { id: 'live_preview', label: 'Live preview',  kinds: ['live_preview'] },
]

const KIND_META = {
  broadcast:    { icon: 'mdi:bullhorn-outline',  label: 'Announcement', color: 'var(--accent-primary)' },
  dm:           { icon: 'mdi:chat-outline',      label: 'Direct',       color: 'var(--accent-primary)' },
  nudge:        { icon: 'mdi:bell-ring-outline', label: 'Nudge',        color: '#fbbf24' },
  live_preview: { icon: 'mdi:eye-outline',       label: 'Live preview', color: '#a78bfa' },
}

export default function Inbox() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [busyIds, setBusyIds] = useState(() => new Set())
  const entries = useInboxStore((s) => s.entries)
  const markReadLocal = useInboxStore((s) => s.markReadLocal)

  const filtered = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)
    if (!f?.kinds) return entries
    return entries.filter((e) => f.kinds.includes(e.kind))
  }, [entries, filter])

  // Auto-mark-read on open for any unread entries currently rendered.
  useEffect(() => {
    const unread = filtered.filter((e) => !e.read && e.kind !== 'dm')
    if (unread.length === 0) return
    for (const e of unread) {
      markReadLocal(e.id)
      broadcastApi.markRead(e.id).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length])

  const handleOpen = async (entry) => {
    if (!entry.read) {
      markReadLocal(entry.id)
      setBusyIds((prev) => new Set(prev).add(entry.id))
      broadcastApi.markRead(entry.id).catch(() => {}).finally(() => {
        setBusyIds((prev) => { const n = new Set(prev); n.delete(entry.id); return n })
      })
    }
    if (entry.kind === 'dm' && entry.thread_id) navigate(`/chat`)
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Inbox</h1>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 14px', borderRadius: 999,
                fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                background: active ? 'var(--accent-primary)' : 'transparent',
                color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'transparent' : 'var(--border-primary)'}`,
                cursor: 'pointer', minHeight: 36,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon icon="mdi:inbox-outline" width={40} style={{ display: 'block', margin: '0 auto 8px' }} />
          Nothing here yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {filtered.map((e) => {
            const meta = KIND_META[e.kind] || KIND_META.broadcast
            const busy = busyIds.has(e.id)
            return (
              <button
                key={e.id}
                onClick={() => handleOpen(e)}
                disabled={busy}
                style={{
                  ...glassStyle,
                  padding: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  borderLeft: e.urgent
                    ? '3px solid var(--status-error)'
                    : `3px solid ${meta.color}`,
                  opacity: e.read ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon icon={meta.icon} width={22} style={{ color: meta.color, flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {!e.read && (
                        <span style={{
                          width: 6, height: 6, borderRadius: 3,
                          background: 'var(--accent-primary)', flexShrink: 0,
                        }} />
                      )}
                      {e.title && <h4 style={{ fontSize: 14, fontWeight: e.read ? 500 : 700 }}>{e.title}</h4>}
                      {e.urgent && (
                        <span style={{
                          padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: 'rgba(239,68,68,0.15)', color: 'var(--status-error)',
                          textTransform: 'uppercase',
                        }}>
                          Urgent
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                        {relativeTime(e.created_at)}
                      </span>
                    </div>
                    {e.body && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                        {e.body}
                      </p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      <span style={{
                        padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                        background: 'var(--bg-tertiary)',
                      }}>
                        {meta.label}
                      </span>
                      {e.from?.name && <span>from {e.from.name}</span>}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
