import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { formsApi } from '../api/endpoints'
import useAppStatusStore from '../stores/useAppStatusStore'
import useOnlineStatus from '../hooks/useOnlineStatus'
import { glassStyle } from '../components/GlassCard'
import { formatDate } from '../utils/dateFormat'

export default function Forms() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const queued = useAppStatusStore((s) => s.pendingSubmissions)
  const queueSubmission = useAppStatusStore((s) => s.queueSubmission)
  const removeSubmission = useAppStatusStore((s) => s.removeSubmission)

  const [tab, setTab] = useState('assigned')
  const [assigned, setAssigned] = useState([])
  const [submitted, setSubmitted] = useState([])
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState(null)
  const [values, setValues] = useState({})
  const [sending, setSending] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      formsApi.assignments().catch(() => []),
      formsApi.submissions().catch(() => []),
    ]).then(([a, s]) => {
      if (cancelled) return
      setAssigned(Array.isArray(a) ? a : [])
      setSubmitted(Array.isArray(s) ? s : [])
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!online || queued.length === 0) return
    ;(async () => {
      for (const q of [...queued]) {
        try {
          await formsApi.submit(q.form_id, q.values)
          removeSubmission(q.id)
        } catch {
          // stays queued
          break
        }
      }
    })()
  }, [online, queued, removeSubmission])

  const openForm = async (assignment) => {
    try {
      const full = await formsApi.get(assignment.form_id || assignment.id)
      setActive(full)
      setValues({})
    } catch {
      setActive(assignment)
      setValues({})
    }
  }

  const handleSubmit = async () => {
    if (!active) return
    setSending(true)
    const payload = { values }
    if (!online) {
      queueSubmission({ id: `offline-${Date.now()}`, form_id: active.id, values })
      setActive(null)
      setSending(false)
      return
    }
    try {
      await formsApi.submit(active.id, payload)
      setAssigned((prev) => prev.filter((a) => (a.form_id || a.id) !== active.id))
      setSubmitted((prev) => [{ id: `sub-${Date.now()}`, form_title: active.title, submitted_at: new Date().toISOString() }, ...prev])
    } finally {
      setActive(null)
      setSending(false)
    }
  }

  if (active) {
    const fields = active.fields || active.schema?.fields || []
    return (
      <div>
        <button
          onClick={() => setActive(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
        >
          <Icon icon="mdi:arrow-left" width={20} /> {t('common.back')}
        </button>
        <div style={{ ...glassStyle, padding: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>{active.title}</h2>
          {fields.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Form has no fields defined in schema — will submit an acknowledgement.
            </p>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {fields.map((f) => (
              <div key={f.key || f.name}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {f.label || f.name}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={values[f.key || f.name] || ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key || f.name]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
                      color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={values[f.key || f.name] || ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key || f.name]: e.target.value }))}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 10,
                      background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
                      color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={sending}
            style={{
              width: '100%', marginTop: 20, padding: 14, borderRadius: 12,
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.6 : 1,
              fontSize: 15, fontWeight: 700, minHeight: 48,
            }}
          >
            {sending ? t('common.loading') : t('forms.submit')}
          </button>
          {!online && (
            <p style={{ fontSize: 12, color: 'var(--status-warning)', marginTop: 10, textAlign: 'center' }}>
              {t('forms.queuedOffline')}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('forms.title')}</h1>

      <div style={{ ...glassStyle, display: 'flex', padding: 4, marginBottom: 16 }}>
        {['assigned', 'submitted'].map((tk) => {
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
              {t(`forms.${tk}`)}
            </button>
          )
        })}
      </div>

      {queued.length > 0 && (
        <div style={{ ...glassStyle, padding: 12, marginBottom: 12, borderColor: 'rgba(251,191,36,0.35)' }}>
          <p style={{ fontSize: 13, color: 'var(--status-warning)', fontWeight: 600 }}>
            <Icon icon="mdi:clock-outline" width={16} style={{ verticalAlign: '-3px', marginRight: 4 }} />
            {queued.length} queued — will sync when online
          </p>
        </div>
      )}

      {loading ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      ) : tab === 'assigned' ? (
        assigned.length === 0 ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('forms.noForms')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {assigned.map((a) => (
              <button
                key={a.id}
                onClick={() => openForm(a)}
                style={{ ...glassStyle, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon icon="mdi:clipboard-text-outline" width={22} style={{ color: 'var(--accent-primary)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600 }}>{a.title || a.form_title}</h4>
                    {a.due_date && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {t('tasks.due')} {formatDate(a.due_date)}
                      </p>
                    )}
                  </div>
                  <Icon icon="mdi:chevron-right" width={20} style={{ color: 'var(--text-muted)' }} />
                </div>
              </button>
            ))}
          </div>
        )
      ) : submitted.length === 0 ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {submitted.map((s) => (
            <div key={s.id} style={{ ...glassStyle, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon icon="mdi:check-circle" width={22} style={{ color: 'var(--status-success)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.form_title || s.title}</h4>
                  {s.submitted_at && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {t('forms.submittedOn')} {formatDate(s.submitted_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
