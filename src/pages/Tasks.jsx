import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { tasksApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { formatDate } from '../utils/dateFormat'
import {
  CATEGORIES, getCategory, categoryBadgeStyle,
  STATUSES, getStatus, statusBadgeStyle, normalizeStatus,
  PRIORITIES, getPriority, priorityDotStyle,
  getRoom, roomDotStyle,
} from '../constants/ops'

/* ---------- Date helpers ---------- */

function toDate(v) {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

function keyForDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonthDates(base) {
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0)
  const firstDow = (start.getDay() + 6) % 7 // Mon-first
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= end.getDate(); d++) cells.push(new Date(base.getFullYear(), base.getMonth(), d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

/* Display-status groups (employee-friendly subset: To Do → In Progress → Done) */
const GROUPS = [
  { id: 'todo',        label: 'To Do',       includes: ['backlog', 'todo'] },
  { id: 'in-progress', label: 'In Progress', includes: ['in-progress', 'review'] },
  { id: 'done',        label: 'Done',        includes: ['done'] },
]

/* ---------- Page ---------- */

export default function Tasks() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState(null)
  const [filterCat, setFilterCat] = useState('all')
  const [filterPrio, setFilterPrio] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [monthBase, setMonthBase] = useState(new Date())
  const [dayFocus, setDayFocus] = useState(null)

  /* Load my tasks */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    tasksApi.list({ assignee: user?.id })
      .then((data) => {
        if (cancelled) return
        const arr = Array.isArray(data) ? data : []
        setTasks(arr.filter((tk) => !tk.assigned_to || tk.assigned_to === user?.id))
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [user?.id])

  const detail = useMemo(() => tasks.find((tk) => tk.id === detailId) || null, [tasks, detailId])

  /* ---------- Filtering ---------- */

  const filtered = useMemo(() => {
    return tasks.filter((tk) => {
      const status = normalizeStatus(tk.status)
      if (filterCat !== 'all' && (tk.cat || tk.category) !== filterCat) return false
      if (filterPrio !== 'all' && (tk.prio || tk.priority) !== filterPrio) return false
      if (filterStatus !== 'all' && status !== filterStatus) return false
      return true
    })
  }, [tasks, filterCat, filterPrio, filterStatus])

  /* ---------- Mutations (own tasks only) ---------- */

  const setStatus = async (task, statusId) => {
    const prev = task.status
    setTasks((list) => list.map((tk) => tk.id === task.id ? { ...tk, status: statusId } : tk))
    try {
      if (statusId === 'done') {
        await tasksApi.complete(task.id, { task_id: task.id, worker_id: user?.id })
      } else {
        await tasksApi.updateStatus(task.id, statusId)
      }
    } catch {
      setTasks((list) => list.map((tk) => tk.id === task.id ? { ...tk, status: prev } : tk))
    }
  }

  const toggleSubtask = async (task, subtaskId, currentDone) => {
    const next = !currentDone
    setTasks((list) => list.map((tk) => {
      if (tk.id !== task.id) return tk
      return {
        ...tk,
        subtasks: (tk.subtasks || []).map((s) =>
          (s.id || s.key) === subtaskId ? { ...s, done: next } : s),
      }
    }))
    try {
      await tasksApi.toggleSubtask(task.id, subtaskId, next)
    } catch {
      // swallow — keep optimistic state
    }
  }

  /* ---------- Detail view ---------- */

  if (detail) {
    return (
      <TaskDetail
        task={detail}
        onBack={() => setDetailId(null)}
        onSetStatus={(sid) => setStatus(detail, sid)}
        onToggleSubtask={(sid, done) => toggleSubtask(detail, sid, done)}
        onOpenForm={() => {
          if (detail.form_id) navigate(`/forms`)
        }}
        t={t}
      />
    )
  }

  /* ---------- List / Calendar frame ---------- */

  const filtersActive = filterCat !== 'all' || filterPrio !== 'all' || filterStatus !== 'all'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>My Tasks</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowFilters((v) => !v)}
            style={{
              ...glassStyle, padding: '6px 12px', borderRadius: 10,
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 600, minHeight: 36, cursor: 'pointer',
              color: filtersActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <Icon icon="mdi:filter-variant" width={14} />
            Filter
            {filtersActive && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent-primary)' }} />}
          </button>
          <div style={{ ...glassStyle, display: 'flex', padding: 3 }}>
            {[
              { id: 'list',     icon: 'mdi:format-list-checks', label: 'List' },
              { id: 'calendar', icon: 'mdi:calendar-month-outline', label: 'Cal' },
            ].map((v) => {
              const active = view === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '6px 10px', borderRadius: 8,
                    fontSize: 12, fontWeight: 600,
                    background: active ? 'var(--accent-bg)' : 'transparent',
                    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    border: 'none', cursor: 'pointer', minHeight: 36,
                  }}
                >
                  <Icon icon={v.icon} width={14} />
                  {v.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div style={{ ...glassStyle, padding: 14, marginBottom: 12, display: 'grid', gap: 10 }}>
          <FilterRow label="Category">
            <FilterChip active={filterCat === 'all'} onClick={() => setFilterCat('all')}>All</FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c.id}
                active={filterCat === c.id}
                onClick={() => setFilterCat(c.id)}
                colorBg={`rgba(${c.rgb}, 0.14)`}
                colorFg={c.color}
              >
                {c.icon} {c.label}
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Priority">
            <FilterChip active={filterPrio === 'all'} onClick={() => setFilterPrio('all')}>All</FilterChip>
            {PRIORITIES.map((p) => (
              <FilterChip key={p.id} active={filterPrio === p.id} onClick={() => setFilterPrio(p.id)}>
                <span style={priorityDotStyle(p.id)} /> {p.label}
              </FilterChip>
            ))}
          </FilterRow>
          <FilterRow label="Status">
            <FilterChip active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>All</FilterChip>
            {STATUSES.map((s) => (
              <FilterChip
                key={s.id}
                active={filterStatus === s.id}
                onClick={() => setFilterStatus(s.id)}
                colorBg={`rgba(${s.rgb}, 0.14)`}
                colorFg={s.color}
              >
                {s.label}
              </FilterChip>
            ))}
          </FilterRow>
          {filtersActive && (
            <button
              onClick={() => { setFilterCat('all'); setFilterPrio('all'); setFilterStatus('all') }}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px', borderRadius: 8,
                background: 'transparent', border: '1px solid var(--border-primary)',
                color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', minHeight: 36,
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ================= LIST VIEW ================= */}
      {view === 'list' && (
        loading ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            {tasks.length === 0 ? t('tasks.noPendingTasks') : 'No tasks match your filters.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {GROUPS.map((group) => {
              const inGroup = filtered.filter((tk) => group.includes.includes(normalizeStatus(tk.status)))
              if (inGroup.length === 0) return null
              return (
                <div key={group.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                    color: 'var(--text-muted)',
                  }}>
                    <span>{group.label}</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>{inGroup.length}</span>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {inGroup.map((tk) => (
                      <TaskCard key={tk.id} task={tk} onClick={() => setDetailId(tk.id)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ================= CALENDAR VIEW ================= */}
      {view === 'calendar' && (
        <CalendarView
          tasks={filtered}
          monthBase={monthBase}
          setMonthBase={setMonthBase}
          dayFocus={dayFocus}
          setDayFocus={setDayFocus}
          onOpenTask={(id) => setDetailId(id)}
          loading={loading}
        />
      )}
    </div>
  )
}

/* ---------- Task card (list view row) ---------- */

function TaskCard({ task, onClick }) {
  const cat = getCategory(task.cat || task.category)
  const room = getRoom(task.room)
  const priority = getPriority(task.prio || task.priority)
  const status = getStatus(task.status)

  return (
    <button
      onClick={onClick}
      style={{
        ...glassStyle,
        padding: 14,
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        borderLeft: `3px solid ${cat.color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ ...priorityDotStyle(priority.id), marginTop: 6 }} title={`Priority: ${priority.label}`} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{task.title}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            <span style={categoryBadgeStyle(cat.id || (task.cat || task.category))}>
              <span style={{ fontSize: 12 }}>{cat.icon}</span> {cat.label}
            </span>
            {room && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                background: `rgba(${room.rgb}, 0.14)`, color: room.color,
              }}>
                <span style={roomDotStyle(room.id)} /> {room.name}
              </span>
            )}
            {task.due_date && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon icon="mdi:calendar-clock" width={12} />
                {formatDate(task.due_date, { year: undefined, month: 'short', day: 'numeric' })}
              </span>
            )}
            {(task.form_id || task.form === true) && (
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon icon="mdi:clipboard-text-outline" width={12} /> Form
              </span>
            )}
          </div>
        </div>
        <span style={statusBadgeStyle(status.id)}>{status.label}</span>
      </div>
    </button>
  )
}

/* ---------- Calendar view ---------- */

function CalendarView({ tasks, monthBase, setMonthBase, dayFocus, setDayFocus, onOpenTask, loading }) {
  const cells = getMonthDates(monthBase)
  const today = new Date()

  const tasksByDate = useMemo(() => {
    const map = {}
    for (const tk of tasks) {
      const d = toDate(tk.due_date)
      if (!d) continue
      const k = keyForDate(d)
      if (!map[k]) map[k] = []
      map[k].push(tk)
    }
    return map
  }, [tasks])

  const monthLabel = formatDate(monthBase, { month: 'long', year: 'numeric', day: undefined })

  const focusKey = dayFocus ? keyForDate(dayFocus) : null
  const tasksOnFocus = focusKey ? (tasksByDate[focusKey] || []) : []

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button
          onClick={() => setMonthBase(new Date(monthBase.getFullYear(), monthBase.getMonth() - 1, 1))}
          style={{
            minWidth: 44, minHeight: 44, background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
          aria-label="Previous month"
        >
          <Icon icon="mdi:chevron-left" width={22} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{monthLabel}</span>
        <button
          onClick={() => setMonthBase(new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 1))}
          style={{
            minWidth: 44, minHeight: 44, background: 'transparent', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}
          aria-label="Next month"
        >
          <Icon icon="mdi:chevron-right" width={22} />
        </button>
      </div>

      <div style={{ ...glassStyle, padding: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const k = keyForDate(d)
            const todays = tasksByDate[k] || []
            const isToday = isSameDay(d, today)
            const isFocus = dayFocus && isSameDay(d, dayFocus)
            return (
              <button
                key={i}
                onClick={() => setDayFocus(d)}
                style={{
                  aspectRatio: '1 / 1',
                  padding: 4,
                  borderRadius: 8,
                  background: isFocus ? 'var(--accent-bg)' : isToday ? 'var(--bg-tertiary)' : 'transparent',
                  border: isToday ? '1px solid var(--accent-primary)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
                  gap: 2,
                  color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600,
                  minHeight: 40,
                }}
              >
                <span>{d.getDate()}</span>
                {todays.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {todays.slice(0, 3).map((tk, idx) => (
                      <span key={tk.id || idx} style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: getCategory(tk.cat || tk.category).color,
                      }} />
                    ))}
                    {todays.length > 3 && (
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{todays.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {loading && (
        <div style={{ ...glassStyle, padding: 16, marginTop: 10, textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      )}

      {dayFocus && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
            {formatDate(dayFocus, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h4>
          {tasksOnFocus.length === 0 ? (
            <div style={{ ...glassStyle, padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No tasks due.</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {tasksOnFocus.map((tk) => (
                <TaskCard key={tk.id} task={tk} onClick={() => onOpenTask(tk.id)} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- Task detail view ---------- */

function TaskDetail({ task, onBack, onSetStatus, onToggleSubtask, onOpenForm, t }) {
  const cat = getCategory(task.cat || task.category)
  const room = getRoom(task.room)
  const priority = getPriority(task.prio || task.priority)
  const currentStatus = normalizeStatus(task.status)

  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(Array.isArray(task.comments) ? task.comments : [])
  const [loadingComments, setLoadingComments] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)

  useEffect(() => {
    if (comments.length > 0) return
    let cancelled = false
    setLoadingComments(true)
    tasksApi.listComments(task.id)
      .then((arr) => !cancelled && setComments(Array.isArray(arr) ? arr : []))
      .catch(() => {})
      .finally(() => !cancelled && setLoadingComments(false))
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id])

  const sendComment = async () => {
    const text = commentText.trim()
    if (!text) return
    setSendingComment(true)
    const optimistic = { id: `tmp-${Date.now()}`, text, created_at: new Date().toISOString(), author: 'You' }
    setComments((c) => [...c, optimistic])
    setCommentText('')
    try {
      const saved = await tasksApi.addComment(task.id, { text })
      if (saved?.id) setComments((c) => [...c.filter((x) => x.id !== optimistic.id), saved])
    } catch {
      setComments((c) => c.filter((x) => x.id !== optimistic.id))
      setCommentText(text)
    } finally {
      setSendingComment(false)
    }
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
      >
        <Icon icon="mdi:arrow-left" width={20} /> {t('common.back')}
      </button>

      <div style={{ ...glassStyle, padding: 20 }}>
        {/* Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <span style={categoryBadgeStyle(cat.id || (task.cat || task.category))}>
            <span>{cat.icon}</span> {cat.label}
          </span>
          {room && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: `rgba(${room.rgb}, 0.14)`, color: room.color,
            }}>
              <span style={roomDotStyle(room.id)} /> {room.name}
            </span>
          )}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
            background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)',
          }}>
            <span style={priorityDotStyle(priority.id)} /> {priority.label}
          </span>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{task.title}</h2>

        {task.due_date && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon icon="mdi:calendar-clock" width={16} />
            {t('tasks.due')} {formatDate(task.due_date)}
          </p>
        )}

        {task.description && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: 16 }}>
            {task.description}
          </p>
        )}

        {/* Status picker */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
            Status
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {STATUSES.filter((s) => s.id !== 'backlog').map((s) => {
              const active = currentStatus === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => onSetStatus(s.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 8,
                    background: active ? `rgba(${s.rgb}, 0.2)` : 'var(--bg-tertiary)',
                    color: active ? s.color : 'var(--text-secondary)',
                    border: active ? `1px solid ${s.color}` : '1px solid var(--border-secondary)',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, minHeight: 36,
                  }}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Subtasks */}
        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
              Subtasks
            </h4>
            <div style={{ display: 'grid', gap: 4 }}>
              {task.subtasks.map((s) => {
                const id = s.id || s.key
                return (
                  <label
                    key={id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: 10, borderRadius: 10,
                      background: 'var(--bg-secondary)',
                      cursor: 'pointer', minHeight: 40,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!s.done}
                      onChange={() => onToggleSubtask(id, !!s.done)}
                      style={{ accentColor: 'var(--accent-primary)', width: 18, height: 18 }}
                    />
                    <span style={{
                      fontSize: 14,
                      color: s.done ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: s.done ? 'line-through' : 'none',
                    }}>
                      {s.title || s.label || s.text}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Linked form */}
        {(task.form_id || task.form === true) && (
          <button
            onClick={onOpenForm}
            style={{
              width: '100%', padding: 12, borderRadius: 10,
              background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
              border: '1px solid var(--border-active)',
              cursor: 'pointer', fontSize: 14, fontWeight: 600, minHeight: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginBottom: 16,
            }}
          >
            <Icon icon="mdi:clipboard-text-outline" width={18} style={{ color: 'var(--accent-primary)' }} />
            Open linked form
          </button>
        )}

        {/* Comments */}
        <div>
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
            Comments ({comments.length})
          </h4>
          {loadingComments ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet.</p>
          ) : (
            <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
              {comments.map((c) => (
                <div key={c.id} style={{ padding: 10, borderRadius: 10, background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-primary)' }}>{c.author || c.user_name || 'Anonymous'}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.created_at ? formatDate(c.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', year: undefined }) : ''}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{c.text || c.body}</p>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
              placeholder="Add a comment…"
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none', minHeight: 44,
              }}
            />
            <button
              onClick={sendComment}
              disabled={!commentText.trim() || sendingComment}
              style={{
                minWidth: 44, minHeight: 44, borderRadius: 10,
                background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                opacity: commentText.trim() ? 1 : 0.4,
              }}
              aria-label="Send comment"
            >
              <Icon icon="mdi:send" width={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- Small bits ---------- */

function FilterRow({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>
    </div>
  )
}

function FilterChip({ active, onClick, colorBg, colorFg, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '6px 12px', borderRadius: 999,
        fontSize: 12, fontWeight: 600,
        background: active ? (colorBg || 'var(--accent-primary)') : 'var(--bg-tertiary)',
        color: active ? (colorFg || 'var(--text-on-accent)') : 'var(--text-secondary)',
        border: active ? `1px solid ${colorFg || 'transparent'}` : '1px solid var(--border-primary)',
        cursor: 'pointer', minHeight: 36,
      }}
    >
      {children}
    </button>
  )
}
