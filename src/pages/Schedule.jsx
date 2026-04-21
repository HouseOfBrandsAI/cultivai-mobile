import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { scheduleApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { formatDate } from '../utils/dateFormat'
import { roomChipStyle, roomDotStyle, getRoom } from '../constants/ops'
import SyncStatusChip from '../components/SyncStatusChip'

/* ---------- Date helpers (Mon-first week) ---------- */

function getWeekDates(base) {
  const start = new Date(base)
  const dow = start.getDay() // 0 = Sun, 1 = Mon
  const diff = (dow + 6) % 7 // shift to Mon-first
  start.setDate(start.getDate() - diff)
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function keyForDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseHours(shift) {
  if (typeof shift.hours === 'number') return shift.hours
  if (!shift.start_time || !shift.end_time) return 0
  const [sh, sm] = String(shift.start_time).split(':').map(Number)
  const [eh, em] = String(shift.end_time).split(':').map(Number)
  if (Number.isNaN(sh) || Number.isNaN(eh)) return 0
  const minutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))
  return Math.max(0, minutes / 60)
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TYPES = ['vacation', 'sick', 'personal', 'other']

const STATUS_COLORS = {
  pending:  { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  approved: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
  denied:   { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
}

/* ---------- Page ---------- */

export default function Schedule() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [view, setView] = useState('week') // 'week' | 'day'
  const [weekBase, setWeekBase] = useState(new Date())
  const [dayBase, setDayBase] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [dayCoworkers, setDayCoworkers] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [showReq, setShowReq] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', type: 'vacation', reason: '' })
  const [sending, setSending] = useState(false)

  const today = new Date()
  const dates = getWeekDates(weekBase)
  const weekKey = dates[0].toISOString().slice(0, 10) + '..' + dates[6].toISOString().slice(0, 10)

  /* Load my shifts for the visible week + my PTO requests. */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      scheduleApi.shifts({
        user_id: user?.id,
        start: keyForDate(dates[0]),
        end: keyForDate(dates[6]),
      }).catch(() => []),
      scheduleApi.timeOffRequests({ user_id: user?.id }).catch(() => []),
    ]).then(([s, r]) => {
      if (cancelled) return
      setShifts(Array.isArray(s) ? s : [])
      setRequests(Array.isArray(r) ? r : [])
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, user?.id])

  /* For Day view: load coworkers on same room + same day. */
  useEffect(() => {
    if (view !== 'day') return
    const todayShift = shifts.find((s) => s.date === keyForDate(dayBase))
    if (!todayShift?.room) { setDayCoworkers([]); return }
    scheduleApi.shifts({
      date: keyForDate(dayBase),
      room: todayShift.room,
    }).then((all) => {
      const arr = Array.isArray(all) ? all : []
      setDayCoworkers(arr.filter((s) => s.user_id !== user?.id))
    }).catch(() => setDayCoworkers([]))
  }, [view, dayBase, shifts, user?.id])

  /* ---------- Summary calculations ---------- */

  const weeklySummary = useMemo(() => {
    const total = shifts.reduce((sum, s) => sum + parseHours(s), 0)
    const overtime = total > 40
    const upcomingPto = requests
      .filter((r) => r.status === 'approved')
      .filter((r) => new Date(r.end_date) >= today)
    return { total: Number(total.toFixed(1)), overtime, upcomingPto }
  }, [shifts, requests, today])

  /* ---------- PTO form ---------- */

  const submitRequest = async () => {
    if (!form.start_date || !form.end_date) return
    setSending(true)
    try {
      await scheduleApi.requestTimeOff({ ...form, user_id: user?.id })
      setShowReq(false)
      setForm({ start_date: '', end_date: '', type: 'vacation', reason: '' })
      const data = await scheduleApi.timeOffRequests({ user_id: user?.id })
      setRequests(Array.isArray(data) ? data : [])
    } finally {
      setSending(false)
    }
  }

  /* ---------- Header ---------- */

  const weekLabel =
    `${formatDate(dates[0], { year: undefined, month: 'short', day: 'numeric' })}` +
    `–${formatDate(dates[6], { year: undefined, month: 'short', day: 'numeric' })}` +
    `, ${dates[0].getFullYear()}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>My Schedule</h1>
        <div style={{ ...glassStyle, display: 'flex', padding: 3 }}>
          {[
            { id: 'week', icon: 'mdi:calendar-week-outline', label: 'Week' },
            { id: 'day',  icon: 'mdi:calendar-today',       label: 'Day' },
          ].map((v) => {
            const active = view === v.id
            return (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', borderRadius: 8,
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

      {/* Week nav */}
      {view === 'week' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button
            onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }}
            style={navBtn}
            aria-label="Previous week"
          >
            <Icon icon="mdi:chevron-left" width={22} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{weekLabel}</span>
          <button
            onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }}
            style={navBtn}
            aria-label="Next week"
          >
            <Icon icon="mdi:chevron-right" width={22} />
          </button>
        </div>
      )}

      {/* Day nav */}
      {view === 'day' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <button
            onClick={() => { const d = new Date(dayBase); d.setDate(d.getDate() - 1); setDayBase(d) }}
            style={navBtn}
            aria-label="Previous day"
          >
            <Icon icon="mdi:chevron-left" width={22} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {formatDate(dayBase, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => { const d = new Date(dayBase); d.setDate(d.getDate() + 1); setDayBase(d) }}
            style={navBtn}
            aria-label="Next day"
          >
            <Icon icon="mdi:chevron-right" width={22} />
          </button>
        </div>
      )}

      {/* ================= WEEK VIEW ================= */}
      {view === 'week' && (
        loading ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {dates.map((d, i) => {
              const key = keyForDate(d)
              const dayShifts = shifts.filter((s) => s.date === key)
              const isTodayDay = isSameDay(d, today)
              return (
                <div
                  key={d.toISOString()}
                  style={{
                    ...glassStyle,
                    padding: 14,
                    borderColor: isTodayDay ? 'var(--accent-primary)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: isTodayDay ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                      {DAY_LABELS[i]} · {formatDate(d, { month: 'short', day: 'numeric', year: undefined })}
                    </p>
                    {isTodayDay && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                        TODAY
                      </span>
                    )}
                  </div>
                  {dayShifts.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Day off</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 6 }}>
                      {dayShifts.map((s, idx) => {
                        const room = getRoom(s.room)
                        return (
                          <div
                            key={s.id || idx}
                            style={{
                              ...roomChipStyle(s.room),
                              padding: '8px 12px',
                              borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              flexWrap: 'wrap', gap: 6,
                              fontSize: 13,
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>
                              {(s.start_time_display || s.start_time || '—')}–{(s.end_time_display || s.end_time || '—')}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, flexWrap: 'wrap' }}>
                              {room?.name || s.room || 'Unassigned'}
                              {s.task_type && <span style={{ opacity: 0.75 }}>· {s.task_type}</span>}
                              {s.calendar_sync_status && s.calendar_sync_status !== 'none' && (
                                <SyncStatusChip
                                  provider={s.calendar_provider || 'google'}
                                  status={s.calendar_sync_status}
                                  lastUpdate={s.calendar_last_synced_at}
                                  errorText={s.calendar_sync_error}
                                  size="xs"
                                />
                              )}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ================= DAY VIEW ================= */}
      {view === 'day' && (() => {
        const dayShifts = shifts.filter((s) => s.date === keyForDate(dayBase))
        if (loading) {
          return <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        }
        if (dayShifts.length === 0) {
          return (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center' }}>
              <Icon icon="mdi:beach" width={40} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <p style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>Day off</p>
            </div>
          )
        }
        return (
          <div style={{ display: 'grid', gap: 10 }}>
            {dayShifts.map((s, idx) => {
              const room = getRoom(s.room)
              return (
                <div key={s.id || idx} style={{ ...glassStyle, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={roomDotStyle(s.room)} />
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {room?.name || s.room || 'Unassigned'}
                    </h3>
                    {s.calendar_sync_status && s.calendar_sync_status !== 'none' && (
                      <span style={{ marginLeft: 'auto' }}>
                        <SyncStatusChip
                          provider={s.calendar_provider || 'google'}
                          status={s.calendar_sync_status}
                          lastUpdate={s.calendar_last_synced_at}
                          errorText={s.calendar_sync_error}
                        />
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={rowStyle}>
                      <Icon icon="mdi:clock-outline" width={16} style={{ color: 'var(--accent-primary)' }} />
                      <span>{(s.start_time_display || s.start_time || '—')}–{(s.end_time_display || s.end_time || '—')}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                        {parseHours(s).toFixed(1)}h
                      </span>
                    </div>
                    {s.task_type && (
                      <div style={rowStyle}>
                        <Icon icon="mdi:check-circle-outline" width={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>{s.task_type}</span>
                      </div>
                    )}
                    {s.notes && (
                      <div style={rowStyle}>
                        <Icon icon="mdi:note-text-outline" width={16} style={{ color: 'var(--accent-primary)' }} />
                        <span>{s.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {dayCoworkers.length > 0 && (
              <div style={{ ...glassStyle, padding: 16 }}>
                <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>
                  On this shift with you
                </h4>
                <div style={{ display: 'grid', gap: 6 }}>
                  {dayCoworkers.map((c, i) => (
                    <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {(c.user_name || c.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.user_name || c.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {(c.start_time_display || c.start_time)}–{(c.end_time_display || c.end_time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ================= SUMMARY + PTO ================= */}
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        <div style={{ ...glassStyle, padding: 16 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>
            Weekly summary
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total hours</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: weeklySummary.overtime ? 'var(--status-warning)' : 'var(--accent-primary)', marginTop: 2 }}>
                {weeklySummary.total}h
                {weeklySummary.overtime && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: 'var(--status-warning)' }}>
                    <Icon icon="mdi:alert" width={14} style={{ verticalAlign: '-3px' }} /> OT
                  </span>
                )}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Shifts this week</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent-primary)', marginTop: 2 }}>
                {shifts.length}
              </p>
            </div>
          </div>
        </div>

        {weeklySummary.upcomingPto.length > 0 && (
          <div style={{ ...glassStyle, padding: 14 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
              Upcoming PTO
            </h4>
            <div style={{ display: 'grid', gap: 6 }}>
              {weeklySummary.upcomingPto.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <Icon icon="mdi:beach" width={18} style={{ color: 'var(--status-warning)' }} />
                  <span style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{r.type || 'pto'}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span style={{ color: 'var(--text-muted)' }}>{r.start_date} → {r.end_date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowReq(true)}
          style={{
            ...glassStyle, padding: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: 'var(--accent-primary)', fontWeight: 600, fontSize: 14,
            minHeight: 48,
          }}
        >
          <Icon icon="mdi:plus-circle-outline" width={20} />
          Request Time Off
        </button>

        {requests.length > 0 && (
          <div>
            <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '8px 0' }}>
              Past requests
            </h4>
            <div style={{ display: 'grid', gap: 6 }}>
              {requests.map((r) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending
                return (
                  <div key={r.id} style={{ ...glassStyle, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {t(`schedule.${r.type || 'other'}`)}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {r.start_date} — {r.end_date}
                        </p>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                        {t(`schedule.${r.status || 'pending'}`)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {showReq && (
        <PtoModal
          form={form}
          setForm={setForm}
          sending={sending}
          onClose={() => setShowReq(false)}
          onSubmit={submitRequest}
          t={t}
        />
      )}
    </div>
  )
}

/* ---------- Small bits ---------- */

const navBtn = {
  minWidth: 44, minHeight: 44,
  background: 'transparent', border: 'none',
  color: 'var(--text-secondary)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const rowStyle = {
  display: 'flex', alignItems: 'center', gap: 8,
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function PtoModal({ form, setForm, sending, onClose, onSubmit, t }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-primary)',
          borderRadius: '20px 20px 0 0',
          padding: '20px 16px calc(var(--safe-b) + 20px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Request Time Off</h3>
          <button onClick={onClose} style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Close">
            <Icon icon="mdi:close" width={22} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <Field label={t('schedule.startDate')}>
            <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label={t('schedule.endDate')}>
            <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label={t('schedule.type')}>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={inputStyle}>
              {TYPES.map((tp) => <option key={tp} value={tp}>{t(`schedule.${tp}`)}</option>)}
            </select>
          </Field>
          <Field label={t('schedule.reason')}>
            <textarea rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </Field>
          <button
            onClick={onSubmit}
            disabled={sending || !form.start_date || !form.end_date}
            style={{
              padding: 14, borderRadius: 12,
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1,
              fontSize: 15, fontWeight: 700, minHeight: 48,
            }}
          >
            {sending ? t('common.loading') : t('schedule.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
