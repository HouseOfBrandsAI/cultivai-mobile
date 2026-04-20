import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { teamApi, chatApi } from '../api/endpoints'
import useAuthStore from '../stores/useAuthStore'
import { glassStyle } from '../components/GlassCard'
import { relativeTime, formatDate } from '../utils/dateFormat'
import {
  DEPARTMENTS,
  getRoom, roomDotStyle,
  empStatusBadgeStyle, EMP_STATUS_META,
  getPriority, priorityDotStyle,
} from '../constants/ops'

const TABS = [
  { id: 'team',          label: 'Team',          icon: 'mdi:account-group-outline' },
  { id: 'announcements', label: 'Announcements', icon: 'mdi:bullhorn-outline' },
]

/* Normalize various backend shapes into the employee-status id. */
function normalizeEmpStatus(member) {
  const raw = member?.shift_status || member?.status
  if (!raw) return member?.room ? 'on' : 'off'
  const s = String(raw).toLowerCase()
  if (['on', 'on-shift', 'on_shift', 'working', 'active'].includes(s)) return 'on'
  if (['pto', 'vacation', 'time-off', 'time_off', 'off-pto'].includes(s)) return 'pto'
  return 'off'
}

function guessDepartment(member) {
  if (member.dept) return member.dept
  if (member.department) return member.department
  const role = (member.role || '').toLowerCase()
  if (role.includes('grow') || role.includes('cultivat') || role.includes('ipm')) return 'Cultivation'
  if (role.includes('trim') || role.includes('dry') || role.includes('process') || role.includes('harvest')) return 'Processing'
  return 'Admin'
}

/* ---------- Page ---------- */

export default function Team() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [tab, setTab] = useState('team')
  const [directory, setDirectory] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loadingDir, setLoadingDir] = useState(true)
  const [loadingAnn, setLoadingAnn] = useState(false)
  const [search, setSearch] = useState('')
  const [profile, setProfile] = useState(null)

  /* Load directory once */
  useEffect(() => {
    let cancelled = false
    setLoadingDir(true)
    teamApi.directory()
      .then((d) => !cancelled && setDirectory(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => !cancelled && setLoadingDir(false))
    return () => { cancelled = true }
  }, [])

  /* Load announcements when tab switches */
  useEffect(() => {
    if (tab !== 'announcements' || announcements.length > 0) return
    let cancelled = false
    setLoadingAnn(true)
    teamApi.announcements()
      .then((a) => !cancelled && setAnnouncements(Array.isArray(a) ? a : []))
      .catch(async () => {
        // Fallback: derive announcements from the team feed
        try {
          const feed = await teamApi.feed()
          const filtered = (Array.isArray(feed) ? feed : [])
            .filter((p) => p.type === 'announcement')
          if (!cancelled) setAnnouncements(filtered)
        } catch {
          if (!cancelled) setAnnouncements([])
        }
      })
      .finally(() => !cancelled && setLoadingAnn(false))
    return () => { cancelled = true }
  }, [tab, announcements.length])

  /* Directory grouped by department */
  const grouped = useMemo(() => {
    const s = search.toLowerCase()
    const filter = (m) => {
      if (!s) return true
      return (m.name || '').toLowerCase().includes(s)
        || (m.role || '').toLowerCase().includes(s)
    }
    const g = {}
    for (const dept of DEPARTMENTS) g[dept] = []
    g['Other'] = []
    for (const m of directory.filter(filter)) {
      const dept = guessDepartment(m)
      if (!g[dept]) g[dept] = []
      g[dept].push(m)
    }
    for (const dept of Object.keys(g)) {
      if (g[dept].length === 0) delete g[dept]
    }
    return g
  }, [directory, search])

  const openChat = async (member) => {
    if (!member?.id || member.id === user?.id) return
    try {
      const created = await chatApi.createConversation({
        conv_type: 'direct',
        participant_ids: [member.id],
      })
      navigate('/chat')
      return created
    } catch {
      navigate('/chat')
    }
  }

  /* ---------- Profile detail ---------- */

  if (profile) {
    const empStatus = normalizeEmpStatus(profile)
    const statusMeta = EMP_STATUS_META[empStatus]
    const room = getRoom(profile.room)
    return (
      <div>
        <button
          onClick={() => setProfile(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
        >
          <Icon icon="mdi:arrow-left" width={20} /> {t('common.back')}
        </button>

        <div style={{ ...glassStyle, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 800, flexShrink: 0,
            }}>
              {(profile.name || '?').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{profile.role || '—'}</p>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={empStatusBadgeStyle(empStatus)}>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: statusMeta.color, display: 'inline-block' }} />
                  {statusMeta.label}
                </span>
                {room && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: `rgba(${room.rgb}, 0.14)`, color: room.color,
                  }}>
                    <span style={roomDotStyle(room.id)} /> {room.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'Role', value: profile.role },
              { label: 'Department', value: guessDepartment(profile) },
              { label: 'Current room', value: room?.name || '—' },
              { label: 'Start date', value: profile.start_date ? formatDate(profile.start_date) : '—' },
              { label: 'Email', value: profile.email, copyable: true },
              { label: 'Phone', value: profile.phone, copyable: true },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: 12, borderRadius: 10, background: 'var(--bg-secondary)',
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', maxWidth: '60%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.value || '—'}
                </span>
              </div>
            ))}
          </div>

          {profile.id && profile.id !== user?.id && (
            <button
              onClick={() => openChat(profile)}
              style={{
                width: '100%', marginTop: 20, padding: 14, borderRadius: 12,
                background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, minHeight: 48,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Icon icon="mdi:chat-outline" width={18} /> Message
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ---------- Main frame ---------- */

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>My Team</h1>

      <div style={{ ...glassStyle, display: 'flex', padding: 4, marginBottom: 12 }}>
        {TABS.map((tk) => {
          const active = tab === tk.id
          return (
            <button
              key={tk.id}
              onClick={() => setTab(tk.id)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 13, fontWeight: 600,
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', minHeight: 40,
              }}
            >
              <Icon icon={tk.icon} width={16} />
              {tk.label}
            </button>
          )
        })}
      </div>

      {tab === 'team' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or role…"
            style={{
              ...glassStyle, padding: '12px 16px', fontSize: 14,
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', minHeight: 48,
            }}
          />
          {loadingDir ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : Object.keys(grouped).length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              {search ? 'No matches.' : t('common.noData')}
            </div>
          ) : Object.entries(grouped).map(([dept, members]) => (
            <div key={dept}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)',
              }}>
                <span>{dept}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>{members.length}</span>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {members.map((m) => {
                  const empStatus = normalizeEmpStatus(m)
                  const room = getRoom(m.room)
                  return (
                    <div key={m.id} style={{ ...glassStyle, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          position: 'relative', flexShrink: 0,
                          width: 42, height: 42, borderRadius: '50%',
                          background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, fontWeight: 700,
                        }}>
                          {(m.name || '?').charAt(0).toUpperCase()}
                          <span style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 12, height: 12, borderRadius: 6,
                            background: EMP_STATUS_META[empStatus].color,
                            border: '2px solid var(--bg-card)',
                          }} />
                        </div>
                        <button
                          onClick={() => setProfile(m)}
                          style={{
                            flex: 1, minWidth: 0, textAlign: 'left',
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <h4 style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.role || '—'}</span>
                            <span style={empStatusBadgeStyle(empStatus)}>{EMP_STATUS_META[empStatus].label}</span>
                            {room && (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                background: `rgba(${room.rgb}, 0.14)`, color: room.color,
                              }}>
                                <span style={roomDotStyle(room.id)} /> {room.name}
                              </span>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => openChat(m)}
                          disabled={!m.id || m.id === user?.id}
                          style={{
                            minWidth: 40, minHeight: 40, borderRadius: 10,
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-primary)',
                            color: 'var(--accent-primary)',
                            cursor: (!m.id || m.id === user?.id) ? 'not-allowed' : 'pointer',
                            opacity: (!m.id || m.id === user?.id) ? 0.3 : 1,
                          }}
                          aria-label={`Message ${m.name}`}
                          title="Message"
                        >
                          <Icon icon="mdi:chat-outline" width={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'announcements' && (
        <div style={{ display: 'grid', gap: 8 }}>
          {loadingAnn ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : announcements.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Icon icon="mdi:bullhorn-outline" width={40} style={{ display: 'block', margin: '0 auto 8px' }} />
              No announcements.
            </div>
          ) : announcements.map((a) => {
            const prio = a.priority ? getPriority(a.priority) : null
            return (
              <div key={a.id} style={{ ...glassStyle, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon icon="mdi:bullhorn" width={22} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {a.title && (
                        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{a.title}</h4>
                      )}
                      {prio && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                          background: `rgba(255,255,255,0.05)`, color: prio.color, textTransform: 'uppercase',
                        }}>
                          <span style={priorityDotStyle(prio.id)} /> {prio.label}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: a.title ? 6 : 0, whiteSpace: 'pre-wrap' }}>
                      {a.content || a.body || a.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                      {(a.from_user?.name || a.author) && (
                        <span>{a.from_user?.name || a.author}</span>
                      )}
                      <span style={{ marginLeft: 'auto' }}>{relativeTime(a.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
