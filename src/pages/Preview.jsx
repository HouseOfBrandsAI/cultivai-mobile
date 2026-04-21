import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { previewApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { relativeTime, formatTime } from '../utils/dateFormat'
import {
  getRoom, roomDotStyle,
  getCategory, categoryBadgeStyle,
  getPriority, priorityDotStyle,
} from '../constants/ops'

/**
 * Live preview consumer — renders the A5 snapshot for a given employee.
 *
 * This page is intentionally route-gated inside the mobile bundle so the
 * manager's phone-frame card on Ops Manager web can iframe it:
 *     <iframe src="http://mobile-host/preview/<user_id>?frame=1" />
 *
 * The URL param `?frame=1` hides the app shell so the iframe is just the
 * content. Otherwise (manager opening it directly in a browser tab), it
 * shows inside the normal shell.
 *
 * RBAC is server-side in /mobile/preview/:user_id. This page trusts the
 * response and renders `allowed: false` as a neutral empty state, not an
 * error toast (compat scenario 4).
 */

export default function Preview() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, snapshot: null, allowed: null, reason: null })

  useEffect(() => {
    let cancelled = false
    previewApi.fetch(userId)
      .then((res) => {
        if (cancelled) return
        if (res?.allowed) {
          // Per the sync contract, the snapshot fields are flattened into
          // the top-level response alongside `allowed: true`. Strip the flag
          // and hand the rest to the renderer as the snapshot.
          const { allowed: _allowed, reason: _reason, ...snapshot } = res
          setState({ loading: false, snapshot, allowed: true, reason: null })
        } else {
          setState({ loading: false, snapshot: null, allowed: false, reason: res?.reason || 'not-authorized' })
        }
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, snapshot: null, allowed: false, reason: 'not-authorized' })
      })
    return () => { cancelled = true }
  }, [userId])

  if (state.loading) {
    return (
      <div style={{ ...glassStyle, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading snapshot…
      </div>
    )
  }

  if (!state.allowed) {
    const msg = {
      'opt-out':         { icon: 'mdi:eye-off-outline', title: 'Live preview off',       body: 'This employee hasn\'t opted in to live preview.' },
      'off-shift':       { icon: 'mdi:sleep',           title: 'Not on shift',           body: 'Live preview is only available while the employee is clocked in.' },
      'not-authorized':  { icon: 'mdi:lock-outline',    title: 'Not authorized',         body: 'You don\'t have permission to view this employee.' },
    }[state.reason] || { icon: 'mdi:alert-outline', title: 'Unavailable', body: 'Live preview is currently unavailable.' }

    return (
      <div>
        <button
          onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
        >
          <Icon icon="mdi:arrow-left" width={20} /> Back
        </button>
        <div style={{ ...glassStyle, padding: 40, textAlign: 'center' }}>
          <Icon icon={msg.icon} width={48} style={{ color: 'var(--text-muted)', display: 'block', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{msg.title}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>{msg.body}</p>
        </div>
      </div>
    )
  }

  return <PreviewSnapshot snapshot={state.snapshot} onBack={() => navigate(-1)} />
}

/* ---------- Snapshot renderer ----------
 * Mirrors the Home.jsx widgets so the manager sees a true replica. */

function PreviewSnapshot({ snapshot, onBack }) {
  const shift = snapshot?.today_shift
  const shiftRoom = shift ? getRoom(shift.room) : null
  const counts = snapshot?.task_counts || { todo: 0, in_progress: 0, due_today: 0, overdue: 0 }
  const nextTasks = snapshot?.next_tasks || []
  const announcements = snapshot?.announcements || []
  const inbox = snapshot?.inbox_preview || []
  const unread = snapshot?.unread || { chat: 0, inbox: 0 }

  const asOf = snapshot?.as_of ? formatTime(snapshot.as_of) : '—'

  return (
    <div>
      {/* Back bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <button
          onClick={onBack}
          style={{ minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Icon icon="mdi:arrow-left" width={20} />
        </button>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            {snapshot?.user?.name || 'Employee'}
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {snapshot?.user?.role || '—'} · snapshot @ {asOf}
          </p>
        </div>
      </div>

      {/* ==== Live banner indicator (read-only) ==== */}
      <div style={{
        padding: '8px 12px', borderRadius: 999, marginBottom: 12,
        background: 'rgba(167, 139, 250, 0.1)',
        border: '1px solid rgba(167, 139, 250, 0.35)',
        color: '#c4b5fd', fontSize: 11, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon icon="mdi:eye-outline" width={14} />
        Live preview · audit-logged · employee sees a banner
      </div>

      {/* ==== Today's shift ==== */}
      <h3 style={sectionLabel}>Today's shift</h3>
      {!shift ? (
        <div style={{ ...glassStyle, padding: 20, textAlign: 'center' }}>
          <Icon icon="mdi:beach" width={36} style={{ display: 'block', margin: '0 auto 6px', color: 'var(--text-muted)' }} />
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Day off</p>
        </div>
      ) : (
        <div style={{
          ...glassStyle, padding: 16,
          borderLeft: shiftRoom ? `3px solid ${shiftRoom.color}` : '3px solid var(--accent-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={roomDotStyle(shift.room)} />
            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {shiftRoom?.name || shift.room || 'Unassigned'}
            </h4>
            {shift.on_shift && (
              <span style={{
                marginLeft: 'auto',
                padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: 'rgba(74,222,128,0.15)', color: '#4ade80', textTransform: 'uppercase',
              }}>
                On shift
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon icon="mdi:clock-outline" width={14} />
              {shift.start_time}–{shift.end_time}
            </span>
            {shift.task_type && <span style={{ color: 'var(--text-muted)' }}>· {shift.task_type}</span>}
          </div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
            <div style={{ width: `${shift.elapsed_pct ?? 0}%`, height: '100%', background: 'var(--accent-primary)' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {shift.hours_remaining?.toFixed?.(1) ?? shift.hours_remaining}h remaining
          </p>
        </div>
      )}

      {/* ==== Task counts ==== */}
      <h3 style={sectionLabel}>My tasks</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { n: counts.todo,        label: 'To do',       color: 'var(--text-secondary)' },
          { n: counts.in_progress, label: 'In progress', color: '#38bdf8' },
          { n: counts.due_today,   label: 'Due today',   color: counts.overdue > 0 ? 'var(--status-error)' : 'var(--accent-primary)' },
        ].map((s, i) => (
          <div key={i} style={{ ...glassStyle, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {nextTasks.length > 0 && (
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {nextTasks.slice(0, 3).map((tk) => {
            const cat = getCategory(tk.cat || tk.category)
            const room = getRoom(tk.room)
            const priority = getPriority(tk.priority || tk.prio)
            return (
              <div key={tk.id} style={{
                ...glassStyle, padding: 12,
                borderLeft: `3px solid ${cat.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={priorityDotStyle(priority.id)} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tk.title}
                  </span>
                  <span style={categoryBadgeStyle(cat.id || (tk.cat || tk.category))}>{cat.icon}</span>
                  {room && <span style={roomDotStyle(room.id)} title={room.name} />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ==== Unread pills ==== */}
      <h3 style={sectionLabel}>Unread</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
        <div style={{ ...glassStyle, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
            {unread.chat || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Chat</div>
        </div>
        <div style={{ ...glassStyle, padding: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)', lineHeight: 1 }}>
            {unread.inbox || 0}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Inbox</div>
        </div>
      </div>

      {/* ==== Announcements ==== */}
      {announcements.length > 0 && (
        <>
          <h3 style={sectionLabel}>Recent announcements</h3>
          <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
            {announcements.slice(0, 2).map((a) => (
              <div key={a.id} style={{ ...glassStyle, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon icon="mdi:bullhorn" width={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {a.title && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</p>}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: a.title ? 2 : 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {a.body}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{relativeTime(a.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ==== Inbox preview ==== */}
      {inbox.length > 0 && (
        <>
          <h3 style={sectionLabel}>Recent inbox</h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {inbox.slice(0, 3).map((e) => (
              <div key={e.id} style={{ ...glassStyle, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <Icon icon={
                    e.kind === 'nudge' ? 'mdi:bell-ring-outline' :
                    e.kind === 'dm' ? 'mdi:chat-outline' :
                    'mdi:bullhorn-outline'
                  } width={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ flex: 1, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.title || e.body}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{relativeTime(e.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const sectionLabel = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
  color: 'var(--text-muted)', marginBottom: 8, marginTop: 16,
}
