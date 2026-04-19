import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { tasksApi, chatApi, scheduleApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { relativeTime } from '../utils/dateFormat'

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'home.greetingMorning'
  if (h < 18) return 'home.greetingAfternoon'
  return 'home.greetingEvening'
}

export default function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [stats, setStats] = useState({ tasks: 0, unread: 0, shifts: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const today = new Date()
        const in7 = new Date(today)
        in7.setDate(today.getDate() + 7)

        const [tasks, convs, shifts] = await Promise.all([
          tasksApi.list({ assignee: user?.id, status: 'pending' }).catch(() => []),
          chatApi.conversations().catch(() => []),
          scheduleApi
            .shifts({
              user_id: user?.id,
              start: today.toISOString().slice(0, 10),
              end: in7.toISOString().slice(0, 10),
            })
            .catch(() => []),
        ])

        if (cancelled) return

        const myTasks = Array.isArray(tasks)
          ? tasks.filter((tk) => !tk.assigned_to || tk.assigned_to === user?.id)
          : []
        const unread = Array.isArray(convs)
          ? convs.reduce((sum, c) => sum + (c.unread_count || 0), 0)
          : 0
        const upcoming = Array.isArray(shifts) ? shifts.length : 0

        setStats({ tasks: myTasks.length, unread, shifts: upcoming })

        const activity = []
        for (const c of (Array.isArray(convs) ? convs : []).slice(0, 3)) {
          if (c.last_message_at) {
            activity.push({
              id: `chat-${c.id}`,
              icon: 'mdi:chat-outline',
              title: c.name,
              detail: c.last_message || t('chat.noMessages'),
              ts: c.last_message_at,
            })
          }
        }
        for (const tk of myTasks.slice(0, 2)) {
          activity.push({
            id: `task-${tk.id}`,
            icon: 'mdi:check-circle-outline',
            title: tk.title,
            detail: tk.task_type?.replace('_', ' ') || t('tasks.title'),
            ts: tk.created_at || tk.due_date,
          })
        }
        activity.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
        setRecent(activity.slice(0, 5))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id, t])

  const greeting = t(greetingKey())
  const firstName = (user?.name || '').split(' ')[0]

  return (
    <div className="space-y-5">
      {/* AI greeting */}
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
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--ai-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            🌱
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-primary)',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            CultivAI
          </span>
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.5, color: 'var(--text-primary)' }}>
          {greeting}
          {firstName ? `, ${firstName}` : ''}.
          {' '}
          {stats.tasks > 0 ? (
            <>You have <strong style={{ color: 'var(--accent-primary)' }}>{stats.tasks}</strong> task{stats.tasks === 1 ? '' : 's'} due today.</>
          ) : (
            <>No tasks due — nice work.</>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { value: stats.tasks, label: t('home.statsTasks'), icon: 'mdi:check-circle-outline' },
          { value: stats.unread, label: t('home.statsMessages'), icon: 'mdi:chat-outline' },
          { value: stats.shifts, label: t('home.statsShifts'), icon: 'mdi:calendar-clock-outline' },
        ].map((s, i) => (
          <div key={i} style={{ ...glassStyle, padding: 16, textAlign: 'center' }}>
            <Icon icon={s.icon} width={20} style={{ color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent-primary)', marginTop: 4, lineHeight: 1 }}>
              {loading ? '…' : s.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>
          {t('home.quickActions')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { key: 'tasks', icon: 'mdi:check-circle-outline', path: '/tasks', label: t('mobile.tasks') },
            { key: 'schedule', icon: 'mdi:calendar-clock-outline', path: '/schedule', label: t('home.viewSchedule') },
            { key: 'forms', icon: 'mdi:clipboard-plus-outline', path: '/forms', label: t('home.newForm') },
          ].map((a) => (
            <button
              key={a.key}
              onClick={() => navigate(a.path)}
              style={{
                ...glassStyle,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                minHeight: 80,
              }}
            >
              <Icon icon={a.icon} width={26} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>
          {t('home.recentActivity')}
        </h3>
        {loading ? (
          <div style={{ ...glassStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('common.loading')}
          </div>
        ) : recent.length === 0 ? (
          <div style={{ ...glassStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
            {t('common.noData')}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {recent.map((item) => (
              <div
                key={item.id}
                style={{
                  ...glassStyle,
                  padding: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <Icon icon={item.icon} width={22} style={{ color: 'var(--accent-primary)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.detail}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {relativeTime(item.ts)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
