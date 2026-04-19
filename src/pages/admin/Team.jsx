import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { teamApi } from '../../api/endpoints'
import { glassStyle } from '../../components/GlassCard'

const TABS = ['directory', 'announcements', 'onboarding', 'rewards']

export default function AdminTeam() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('directory')
  const [directory, setDirectory] = useState([])
  const [steps, setSteps] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAnn, setShowAnn] = useState(false)
  const [showStep, setShowStep] = useState(false)
  const [showGrant, setShowGrant] = useState(null) // member
  const [annForm, setAnnForm] = useState({ content: '' })
  const [stepForm, setStepForm] = useState({ title: '', description: '' })
  const [grantForm, setGrantForm] = useState({ points: 10, reason: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    teamApi.directory().then((d) => setDirectory(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    if (tab === 'onboarding') {
      setLoading(true)
      teamApi.onboardingStepsAdmin()
        .then((d) => !cancelled && setSteps(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    } else {
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [tab])

  const postAnn = async () => {
    if (!annForm.content.trim()) return
    setSaving(true)
    try {
      await teamApi.createAnnouncement({ content: annForm.content.trim() })
      setShowAnn(false)
      setAnnForm({ content: '' })
    } finally {
      setSaving(false)
    }
  }

  const addStep = async () => {
    if (!stepForm.title.trim()) return
    setSaving(true)
    try {
      const res = await teamApi.createOnboardingStep(stepForm)
      if (res?.id) setSteps((prev) => [...prev, res])
      setShowStep(false)
      setStepForm({ title: '', description: '' })
    } finally {
      setSaving(false)
    }
  }

  const removeStep = async (id) => {
    if (!confirm('Delete this step?')) return
    try {
      await teamApi.deleteOnboardingStep(id)
      setSteps((prev) => prev.filter((s) => s.id !== id))
    } catch {}
  }

  const grant = async () => {
    if (!showGrant || !grantForm.points) return
    setSaving(true)
    try {
      await teamApi.grantPoints({ user_id: showGrant.id, points: Number(grantForm.points), reason: grantForm.reason })
      setShowGrant(null)
      setGrantForm({ points: 10, reason: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('admin.team')}</h1>

      <div style={{ ...glassStyle, display: 'flex', padding: 4, marginBottom: 16, overflowX: 'auto' }}>
        {TABS.map((tk) => {
          const active = tab === tk
          return (
            <button
              key={tk}
              onClick={() => setTab(tk)}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 10, whiteSpace: 'nowrap',
                fontSize: 13, fontWeight: 600,
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer', minHeight: 40,
                textTransform: 'capitalize',
              }}
            >
              {tk}
            </button>
          )
        })}
      </div>

      {tab === 'directory' && (
        directory.length === 0 ? (
          <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {directory.map((m) => (
              <div key={m.id} style={{ ...glassStyle, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {(m.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {m.role || '—'} {m.email ? `· ${m.email}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowGrant(m)}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: 'var(--accent-bg)', color: 'var(--accent-primary)',
                      border: '1px solid var(--border-active)', cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, minHeight: 36,
                    }}
                  >
                    {t('admin.grantPoints')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'announcements' && (
        <button
          onClick={() => setShowAnn(true)}
          style={{
            width: '100%', padding: 14, borderRadius: 12,
            background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
            border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            minHeight: 48,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Icon icon="mdi:bullhorn" width={20} />
          {t('admin.newAnnouncement')}
        </button>
      )}

      {tab === 'onboarding' && (
        <>
          <button
            onClick={() => setShowStep(true)}
            style={{
              width: '100%', padding: 14, borderRadius: 12,
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
              minHeight: 48, marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Icon icon="mdi:plus-circle-outline" width={20} />
            Add onboarding step
          </button>
          {loading ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : steps.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {steps.map((s) => (
                <div key={s.id} style={{ ...glassStyle, padding: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <Icon icon="mdi:checkbox-marked-circle-outline" width={22} style={{ color: 'var(--accent-primary)', marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</h4>
                    {s.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{s.description}</p>}
                  </div>
                  <button
                    onClick={() => removeStep(s.id)}
                    style={{ minWidth: 40, minHeight: 40, background: 'transparent', border: 'none', color: 'var(--status-error)', cursor: 'pointer' }}
                    aria-label="Delete step"
                  >
                    <Icon icon="mdi:trash-can-outline" width={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'rewards' && (
        <div style={{ ...glassStyle, padding: 24, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          Grant points to employees from the <strong style={{ color: 'var(--text-primary)' }}>Directory</strong> tab.
          Reward catalog management is handled by the Desktop admin.
        </div>
      )}

      {showAnn && (
        <Modal title={t('admin.newAnnouncement')} onClose={() => setShowAnn(false)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <textarea
              rows={5}
              value={annForm.content}
              onChange={(e) => setAnnForm({ content: e.target.value })}
              placeholder="Announcement message…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button
              onClick={postAnn}
              disabled={saving || !annForm.content.trim()}
              style={submitBtn(saving || !annForm.content.trim())}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}

      {showStep && (
        <Modal title="New onboarding step" onClose={() => setShowStep(false)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label={t('admin.title')}>
              <input value={stepForm.title} onChange={(e) => setStepForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Description">
              <textarea rows={3} value={stepForm.description} onChange={(e) => setStepForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
            <button onClick={addStep} disabled={saving || !stepForm.title.trim()} style={submitBtn(saving || !stepForm.title.trim())}>
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}

      {showGrant && (
        <Modal title={`Grant points — ${showGrant.name}`} onClose={() => setShowGrant(null)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label="Points">
              <input type="number" value={grantForm.points} min={1} onChange={(e) => setGrantForm((f) => ({ ...f, points: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Reason (optional)">
              <input value={grantForm.reason} onChange={(e) => setGrantForm((f) => ({ ...f, reason: e.target.value }))} style={inputStyle} />
            </Field>
            <button onClick={grant} disabled={saving || !grantForm.points} style={submitBtn(saving || !grantForm.points)}>
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
}

const submitBtn = (disabled) => ({
  padding: 14, borderRadius: 12,
  background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
  border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 15, fontWeight: 700, minHeight: 48,
  opacity: disabled ? 0.5 : 1,
})

function Field({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }) {
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
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h3>
          <button onClick={onClose} style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Close">
            <Icon icon="mdi:close" width={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
