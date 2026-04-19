import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { tasksApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { formatDate } from '../utils/dateFormat'

const FILTERS = ['today', 'overdue', 'upcoming', 'completed']

const PRIORITY_COLORS = {
  high:   { bg: 'rgba(239,68,68,0.15)',  text: '#f87171', border: 'rgba(239,68,68,0.35)' },
  medium: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', border: 'rgba(251,191,36,0.35)' },
  low:    { bg: 'rgba(96,165,250,0.15)', text: '#60a5fa', border: 'rgba(96,165,250,0.35)' },
}

function toDateKey(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function Tasks() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [filter, setFilter] = useState('today')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

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

  const filtered = useMemo(() => {
    const todayKey = toDateKey(new Date())
    return tasks.filter((tk) => {
      const dueKey = toDateKey(tk.due_date)
      if (filter === 'today') return dueKey === todayKey && tk.status !== 'completed'
      if (filter === 'overdue') return dueKey && dueKey < todayKey && tk.status !== 'completed'
      if (filter === 'upcoming') return dueKey && dueKey > todayKey && tk.status !== 'completed'
      if (filter === 'completed') return tk.status === 'completed'
      return true
    })
  }, [tasks, filter])

  const handleComplete = async (taskId) => {
    try {
      await tasksApi.complete(taskId, { task_id: taskId, worker_id: user?.id })
      setTasks((prev) => prev.map((tk) => tk.id === taskId ? { ...tk, status: 'completed' } : tk))
      setDetail(null)
    } catch {
      // ignore
    }
  }

  if (detail) {
    const pc = PRIORITY_COLORS[detail.priority] || PRIORITY_COLORS.medium
    return (
      <div>
        <button
          onClick={() => setDetail(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
        >
          <Icon icon="mdi:arrow-left" width={20} /> {t('common.back')}
        </button>
        <div style={{ ...glassStyle, padding: 20 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {detail.priority && (
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}>
                {t('tasks.priority')}: {detail.priority}
              </span>
            )}
            {detail.room && (
              <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {detail.room}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>{detail.title}</h2>
          {detail.due_date && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              {t('tasks.due')} {formatDate(detail.due_date)}
            </p>
          )}
          {detail.description && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {detail.description}
            </p>
          )}
          {detail.status !== 'completed' && (
            <button
              onClick={() => handleComplete(detail.id)}
              style={{
                width: '100%', marginTop: 20, padding: 14, borderRadius: 12,
                background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, minHeight: 48,
              }}
            >
              <Icon icon="mdi:check" width={18} style={{ verticalAlign: '-3px', marginRight: 6 }} />
              {t('tasks.complete')}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('tasks.title')}</h1>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 8 }}>
        {FILTERS.map((f) => {
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 14px', borderRadius: 999,
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
                background: active ? 'var(--accent-primary)' : 'transparent',
                color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'transparent' : 'var(--border-primary)'}`,
                cursor: 'pointer', minHeight: 40,
              }}
            >
              {t(`tasks.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('tasks.noPendingTasks')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {filtered.map((tk) => {
            const pc = PRIORITY_COLORS[tk.priority] || PRIORITY_COLORS.medium
            return (
              <button
                key={tk.id}
                onClick={() => setDetail(tk)}
                style={{ ...glassStyle, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{tk.title}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      {tk.room && <span>{tk.room}</span>}
                      {tk.task_type && <span style={{ textTransform: 'capitalize' }}>{tk.task_type.replace('_', ' ')}</span>}
                      {tk.due_date && <span>{formatDate(tk.due_date)}</span>}
                    </div>
                  </div>
                  {tk.priority && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 999,
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                      background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`,
                    }}>
                      {tk.priority}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
