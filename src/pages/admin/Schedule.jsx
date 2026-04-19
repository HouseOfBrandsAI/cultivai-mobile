import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { scheduleApi, teamApi } from '../../api/endpoints'
import { glassStyle } from '../../components/GlassCard'

export default function AdminSchedule() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('shifts')
  const [shifts, setShifts] = useState([])
  const [requests, setRequests] = useState([])
  const [directory, setDirectory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ user_id: '', date: '', start_time: '08:00', end_time: '16:00', room: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    teamApi.directory().then((d) => setDirectory(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (tab === 'shifts') {
      const today = new Date()
      const in14 = new Date(today)
      in14.setDate(today.getDate() + 14)
      scheduleApi.shifts({
        start: today.toISOString().slice(0, 10),
        end: in14.toISOString().slice(0, 10),
      })
        .then((d) => !cancelled && setShifts(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    } else {
      scheduleApi.timeOffRequests({ status: 'pending' })
        .then((d) => !cancelled && setRequests(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    }
    return () => { cancelled = true }
  }, [tab])

  const createShift = async () => {
    if (!form.user_id || !form.date) return
    setSaving(true)
    try {
      const created = await scheduleApi.createShift(form)
      if (created?.id) setShifts((prev) => [created, ...prev])
      setShowForm(false)
      setForm({ user_id: '', date: '', start_time: '08:00', end_time: '16:00', room: '' })
    } finally {
      setSaving(false)
    }
  }

  const removeShift = async (id) => {
    if (!confirm('Delete this shift?')) return
    try {
      await scheduleApi.deleteShift(id)
      setShifts((prev) => prev.filter((s) => s.id !== id))
    } catch {}
  }

  const decide = async (req, approve) => {
    try {
      if (approve) await scheduleApi.approveTimeOff(req.id)
      else await scheduleApi.denyTimeOff(req.id)
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
    } catch {}
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('admin.schedule')}</h1>

      <div style={{ ...glassStyle, display: 'flex', padding: 4, marginBottom: 16 }}>
        {['shifts', 'requests'].map((tk) => {
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
              {tk === 'shifts' ? 'Shifts' : 'Time-off requests'}
            </button>
          )
        })}
      </div>

      {tab === 'shifts' && (
        <>
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: '100%', padding: 14, borderRadius: 12,
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              minHeight: 48, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon icon="mdi:plus-circle-outline" width={20} />
            {t('admin.createShift')}
          </button>

          {loading ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : shifts.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {shifts.map((s) => {
                const member = directory.find((m) => m.id === s.user_id)
                return (
                  <div key={s.id} style={{ ...glassStyle, padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Icon icon="mdi:calendar-clock" width={22} style={{ color: 'var(--accent-primary)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {member?.name || s.user_id}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {s.date} · {s.start_time_display || s.start_time}–{s.end_time_display || s.end_time}
                        {s.room ? ` · ${s.room}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => removeShift(s.id)}
                      style={{ minWidth: 40, minHeight: 40, background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}
                      aria-label="Delete"
                    >
                      <Icon icon="mdi:trash-can-outline" width={18} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        loading ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
        ) : requests.length === 0 ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {requests.map((r) => {
              const member = directory.find((m) => m.id === r.user_id)
              return (
                <div key={r.id} style={{ ...glassStyle, padding: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {member?.name || r.user_id}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, textTransform: 'capitalize' }}>
                    {r.type} · {r.start_date} — {r.end_date}
                  </p>
                  {r.reason && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6 }}>{r.reason}</p>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => decide(r, true)}
                      style={{
                        flex: 1, padding: 10, borderRadius: 10,
                        background: 'var(--status-success)', color: 'var(--text-on-accent)',
                        border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, minHeight: 40,
                      }}
                    >
                      {t('admin.approveRequest')}
                    </button>
                    <button
                      onClick={() => decide(r, false)}
                      style={{
                        flex: 1, padding: 10, borderRadius: 10,
                        background: 'transparent', color: 'var(--status-error)',
                        border: '1px solid var(--status-error)', cursor: 'pointer',
                        fontSize: 13, fontWeight: 600, minHeight: 40,
                      }}
                    >
                      {t('admin.denyRequest')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {showForm && (
        <div
          onClick={() => setShowForm(false)}
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
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t('admin.createShift')}</h3>
              <button onClick={() => setShowForm(false)} style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Close">
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <Field label="Employee">
                <select value={form.user_id} onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))} style={inputStyle}>
                  <option value="">Select…</option>
                  {directory.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Field label="Start"><input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} style={inputStyle} /></Field>
                <Field label="End"><input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} style={inputStyle} /></Field>
              </div>
              <Field label="Room">
                <input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="Flower A, Veg 1, Trim…" style={inputStyle} />
              </Field>
              <button
                onClick={createShift}
                disabled={saving || !form.user_id || !form.date}
                style={{
                  padding: 14, borderRadius: 12,
                  background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, minHeight: 48,
                  opacity: (saving || !form.user_id || !form.date) ? 0.5 : 1,
                }}
              >
                {saving ? t('common.loading') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
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
