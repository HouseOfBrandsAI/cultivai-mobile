import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { scheduleApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { formatDate } from '../utils/dateFormat'

function getWeekDates(base) {
  const start = new Date(base)
  start.setDate(start.getDate() - start.getDay())
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

const STATUS_COLORS = {
  pending:  { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  approved: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80' },
  denied:   { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
}

const TYPES = ['vacation', 'sick', 'personal', 'other']

export default function Schedule() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState('schedule')
  const [weekBase, setWeekBase] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReq, setShowReq] = useState(false)
  const [form, setForm] = useState({ start_date: '', end_date: '', type: 'vacation', reason: '' })
  const [sending, setSending] = useState(false)

  const today = new Date()
  const dates = getWeekDates(weekBase)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (tab === 'schedule') {
      scheduleApi.shifts({
        user_id: user?.id,
        start: keyForDate(dates[0]),
        end: keyForDate(dates[6]),
      })
        .then((data) => { if (!cancelled) setShifts(Array.isArray(data) ? data : []) })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    } else {
      scheduleApi.timeOffRequests({ user_id: user?.id })
        .then((data) => { if (!cancelled) setRequests(Array.isArray(data) ? data : []) })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, weekBase, user?.id])

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

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('schedule.title')}</h1>

      <div style={{ ...glassStyle, display: 'flex', padding: 4, marginBottom: 16 }}>
        {['schedule', 'timeoff'].map((tk) => {
          const active = tab === tk
          return (
            <button
              key={tk}
              onClick={() => setTab(tk)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', minHeight: 40,
              }}
            >
              {t(tk === 'schedule' ? 'schedule.mySchedule' : 'schedule.timeOff')}
            </button>
          )
        })}
      </div>

      {tab === 'schedule' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d) }}
              style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              aria-label="Previous week"
            >
              <Icon icon="mdi:chevron-left" width={24} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('schedule.weekOf')} {formatDate(dates[0], { year: undefined, month: 'short', day: 'numeric' })}
            </span>
            <button
              onClick={() => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d) }}
              style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              aria-label="Next week"
            >
              <Icon icon="mdi:chevron-right" width={24} />
            </button>
          </div>

          {loading ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {dates.map((d) => {
                const key = keyForDate(d)
                const dayShifts = shifts.filter((s) => s.date === key)
                const isToday = isSameDay(d, today)
                return (
                  <div
                    key={d.toISOString()}
                    style={{
                      ...glassStyle, padding: 14,
                      borderColor: isToday ? 'var(--accent-primary)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                        {formatDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: undefined })}
                      </p>
                      {isToday && (
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'var(--accent-bg)', color: 'var(--accent-primary)', fontWeight: 700 }}>
                          TODAY
                        </span>
                      )}
                    </div>
                    {dayShifts.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('schedule.noShifts')}</p>
                    ) : (
                      <div style={{ display: 'grid', gap: 4 }}>
                        {dayShifts.map((s, i) => (
                          <div
                            key={s.id || i}
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              background: 'var(--bg-tertiary)',
                              borderLeft: '3px solid var(--accent-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              fontSize: 13,
                            }}
                          >
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              {s.start_time_display || s.start_time} - {s.end_time_display || s.end_time}
                            </span>
                            {s.room && <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{s.room}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'timeoff' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button
            onClick={() => setShowReq(true)}
            style={{
              ...glassStyle, padding: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: 'var(--accent-primary)', fontWeight: 600, fontSize: 14,
              minHeight: 56,
            }}
          >
            <Icon icon="mdi:plus-circle-outline" width={20} />
            {t('schedule.requestTimeOff')}
          </button>

          {loading ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : requests.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {requests.map((r) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending
                return (
                  <div key={r.id} style={{ ...glassStyle, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                          {t(`schedule.${r.type || 'other'}`)}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {r.start_date} — {r.end_date}
                        </p>
                        {r.reason && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.reason}</p>}
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.text }}>
                        {t(`schedule.${r.status || 'pending'}`)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {showReq && (
        <div
          onClick={() => setShowReq(false)}
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
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t('schedule.requestTimeOff')}</h3>
              <button onClick={() => setShowReq(false)} style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Close">
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field label={t('schedule.startDate')}>
                <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} style={fieldStyle} />
              </Field>
              <Field label={t('schedule.endDate')}>
                <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} style={fieldStyle} />
              </Field>
              <Field label={t('schedule.type')}>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} style={fieldStyle}>
                  {TYPES.map((tp) => <option key={tp} value={tp}>{t(`schedule.${tp}`)}</option>)}
                </select>
              </Field>
              <Field label={t('schedule.reason')}>
                <textarea rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </Field>
              <button
                onClick={submitRequest}
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
      )}
    </div>
  )
}

const fieldStyle = {
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
