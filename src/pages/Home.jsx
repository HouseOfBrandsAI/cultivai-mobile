import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { tasksApi, scheduleApi, teamApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { relativeTime } from '../utils/dateFormat'
import {
  getRoom, roomDotStyle,
  getCategory, categoryBadgeStyle,
  getPriority, priorityDotStyle,
  normalizeStatus,
} from '../constants/ops'

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'home.greetingMorning'
  if (h < 18) return 'home.greetingAfternoon'
  return 'home.greetingEvening'
}

function keyForDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseTimeToday(hhmm) {
  if (!hhmm) return null
  const [h, m] = String(hhmm).split(':').map(Number)
  if (Number.isNaN(h)) return null
  const d = new Date()
  d.setHours(h, m || 0, 0, 0)
  return d
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isOverdue(task) {
  if (task.due_date == null) return false
  const d = new Date(task.due_date)
  if (Number.isNaN(d.getTime())) return false
  return d < new Date() && normalizeStatus(task.status) !== 'done'
}

function isDueToday(task) {
  if (task.due_date == null) return false
  const d = new Date(task.due_date)
  return !Number.isNaN(d.getTime()) && isSameDay(d, new Date())
}

/* ---------- Page ---------- */

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [todayShift, setTodayShift] = useState(null)
  const [tasks, setTasks] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const todayKey = keyForDate(new Date())

      try {
        const [shifts, myTasks, anns] = await Promise.all([
          scheduleApi.shifts({
            user_id: user?.id,
            start: todayKey,
            end: todayKey,
          }).catch(() => []),
          tasksApi.list({ assignee: user?.id }).catch(() => []),
          teamApi.announcements()
            .catch(() => teamApi.feed().catch(() => []))
            .then((data) => {
              const arr = Array.isArray(data) ? data : []
              return arr.filter((a) => !a.type || a.type === 'announcement')
            }),
        ])

        if (cancelled) return

        const shiftArr = Array.isArray(shifts) ? shifts : []
        setTodayShift(shiftArr.find((s) => s.date === todayKey) || null)

        const taskArr = Array.isArray(myTasks) ? myTasks : []
        setTasks(taskArr.filter((tk) => !tk.assigned_to || tk.assigned_to === user?.id))

        setAnnouncements(anns.slice(0, 2))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  /* ---------- Derived counts ---------- */

  const counts = useMemo(() => {
    let todo = 0, inProgress = 0, dueToday = 0, overdue = 0
    for (const tk of tasks) {
      const s = normalizeStatus(tk.status)
      if (s === 'todo' || s === 'backlog') todo += 1
      if (s === 'in-progress' || s === 'review') inProgress += 1
      if (isDueToday(tk) && s !== 'done') dueToday += 1
      if (isOverdue(tk)) overdue += 1
    }
    return { todo, inProgress, dueToday, overdue }
  }, [tasks])

  const next3 = useMemo(() => {
    const open = tasks.filter((tk) => normalizeStatus(tk.status) !== 'done')
    open.sort((a, b) => {
      const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return ad - bd
    })
    return open.slice(0, 3)
  }, [tasks])

  const greeting = t(greetingKey())
  const firstName = (user?.name || '').split(' ')[0]

  /* ---------- Shift card pieces ---------- */

  const shiftRoom = todayShift ? getRoom(todayShift.room) : null

  const shiftSummary = useMemo(() => {
    if (!todayShift) return null
    const start = parseTimeToday(todayShift.start_time)
    const end = parseTimeToday(todayShift.end_time)
    if (!start || !end) return null
    const now = new Date()
    const totalMs = end - start
    const elapsedMs = Math.max(0, Math.min(totalMs, now - start))
    const remainingMs = Math.max(0, end - now)
    const pct = totalMs > 0 ? Math.round((elapsedMs / totalMs) * 100) : 0
    const onShift = now >= start && now <= end
    const hoursRemaining = remainingMs / 3600000
    return { start, end, pct, onShift, hoursRemaining, done: now > end }
  }, [todayShift])

  return (
    <div className="space-y-5">
      {/* ============ AI greeting ============ */}
      <div
        style={{
          padding: 20,
          borderRadius: 20,
          background: 'var(--ai-bg)',
          border: '1px solid var(--border-primary)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 8,
              background: 'var(--ai-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🌱
          </div>
          <span
            style={{
              fontSize: 12, fontWeight: 600,
              color: 'var(--accent-primary)',
              letterSpacing: 0.5, textTransform: 'uppercase',
            }}
          >
            CultivAI
          </span>
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text-primary)' }}>
          {greeting}{firstName ? `, ${firstName}` : ''}.
          {' '}
          {counts.dueToday > 0 ? (
            <>You have <strong style={{ color: 'var(--accent-primary)' }}>{counts.dueToday}</strong> task{counts.dueToday === 1 ? '' : 's'} due today.</>
          ) : counts.overdue > 0 ? (
            <>You have <strong style={{ color: 'var(--status-error)' }}>{counts.overdue}</strong> overdue task{counts.overdue === 1 ? '' : 's'}.</>
          ) : (
            <>Nothing due today — looking good.</>
          )}
        </div>
      </div>

      {/* ============ Today's Shift card ============ */}
      <div>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
          Today's shift
        </h3>
        {loading ? (
          <div style={{ ...glassStyle, padding: 20, color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : !todayShift ? (
          <div style={{ ...glassStyle, padding: 20, textAlign: 'center' }}>
            <Icon icon="mdi:beach" width={36} style={{ display: 'block', margin: '0 auto 6px', color: 'var(--text-muted)' }} />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>Day off</p>
          </div>
        ) : (
          <button
            onClick={() => navigate('/schedule')}
            style={{
              ...glassStyle, padding: 16, width: '100%', textAlign: 'left',
              cursor: 'pointer', color: 'var(--text-primary)',
              borderLeft: shiftRoom ? `3px solid ${shiftRoom.color}` : '3px solid var(--accent-primary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={roomDotStyle(todayShift.room)} />
              <h4 style={{ fontSize: 15, fontWeight: 700 }}>
                {shiftRoom?.name || todayShift.room || 'Unassigned'}
              </h4>
              {shiftSummary?.onShift && (
                <span style={{
                  marginLeft: 'auto',
                  padding: '2px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: 'rgba(74,222,128,0.15)', color: '#4ade80', textTransform: 'uppercase',
                }}>
                  On shift
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon icon="mdi:clock-outline" width={14} />
                {todayShift.start_time_display || todayShift.start_time}–{todayShift.end_time_display || todayShift.end_time}
              </span>
              {todayShift.task_type && (
                <span style={{ color: 'var(--text-muted)' }}>· {todayShift.task_type}</span>
              )}
            </div>
            {shiftSummary && (
              <div style={{ marginTop: 10 }}>
                <div style={{
                  height: 4, borderRadius: 2, overflow: 'hidden',
                  background: 'var(--bg-tertiary)',
                }}>
                  <div style={{
                    width: `${shiftSummary.pct}%`, height: '100%',
                    background: shiftSummary.done ? 'var(--text-muted)' : 'var(--accent-primary)',
                    transition: 'width .3s',
                  }} />
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  {shiftSummary.done
                    ? 'Shift complete'
                    : shiftSummary.onShift
                      ? `${shiftSummary.hoursRemaining.toFixed(1)}h remaining`
                      : `Starts ${shiftSummary.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                </p>
              </div>
            )}
          </button>
        )}
      </div>

      {/* ============ My Tasks summary ============ */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
            My tasks
          </h3>
          <button
            onClick={() => navigate('/tasks')}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, minHeight: 32,
            }}
          >
            View all <Icon icon="mdi:chevron-right" width={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
          {[
            { n: counts.todo,       label: 'To do',       color: 'var(--text-secondary)' },
            { n: counts.inProgress, label: 'In progress', color: '#38bdf8' },
            { n: counts.dueToday,   label: 'Due today',   color: counts.overdue > 0 ? 'var(--status-error)' : 'var(--accent-primary)' },
          ].map((s, i) => (
            <div key={i} style={{ ...glassStyle, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {loading ? '…' : s.n}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {next3.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            {next3.map((tk) => {
              const cat = getCategory(tk.cat || tk.category)
              const room = getRoom(tk.room)
              const priority = getPriority(tk.prio || tk.priority)
              return (
                <button
                  key={tk.id}
                  onClick={() => navigate('/tasks')}
                  style={{
                    ...glassStyle, padding: 12, textAlign: 'left',
                    cursor: 'pointer', color: 'var(--text-primary)',
                    borderLeft: `3px solid ${cat.color}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...priorityDotStyle(priority.id), marginTop: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tk.title}
                    </span>
                    <span style={categoryBadgeStyle(cat.id || (tk.cat || tk.category))}>
                      {cat.icon}
                    </span>
                    {room && <span style={roomDotStyle(room.id)} title={room.name} />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ============ Recent announcements ============ */}
      {announcements.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)' }}>
              Recent announcements
            </h3>
            <button
              onClick={() => navigate('/team')}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 4, minHeight: 32,
              }}
            >
              View all <Icon icon="mdi:chevron-right" width={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {announcements.map((a) => (
              <div key={a.id} style={{ ...glassStyle, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon icon="mdi:bullhorn" width={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {a.title && (
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.title}</p>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: a.title ? 2 : 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {a.content || a.body || a.message}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{relativeTime(a.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============ Quick actions ============ */}
      <div>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
          Quick actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { key: 'clock',    icon: 'mdi:clock-outline',             path: '/schedule', label: 'Clock In / Out' },
            { key: 'forms',    icon: 'mdi:clipboard-text-outline',    path: '/forms',    label: 'Open forms' },
            { key: 'schedule', icon: 'mdi:calendar-clock-outline',    path: '/schedule', label: 'View schedule' },
          ].map((a) => (
            <button
              key={a.key}
              onClick={() => navigate(a.path)}
              style={{
                ...glassStyle,
                padding: 14,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                cursor: 'pointer', color: 'var(--text-primary)',
                minHeight: 80,
              }}
            >
              <Icon icon={a.icon} width={24} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
