import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { documentsApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'

const TABS = ['library', 'onboarding', 'myDocs']

const CATEGORY_COLORS = {
  sop:        { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', label: 'SOP' },
  safety:     { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', label: 'Safety' },
  training:   { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', label: 'Training' },
  equipment:  { bg: 'rgba(139,92,246,0.15)',  text: '#a78bfa', label: 'Equipment' },
  hr:         { bg: 'rgba(236,72,153,0.15)',  text: '#f472b6', label: 'HR' },
  compliance: { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', label: 'Compliance' },
}

function getCategory(cat) {
  return CATEGORY_COLORS[cat] || { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)', label: cat || 'Other' }
}

export default function Docs() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('library')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [documents, setDocuments] = useState([])
  const [steps, setSteps] = useState([])
  const [progress, setProgress] = useState([])
  const [myDocs, setMyDocs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      documentsApi.list({ published: true }).catch(() => []),
      documentsApi.onboardingSteps().catch(() => []),
      documentsApi.onboardingProgress().catch(() => []),
      documentsApi.myDocs().catch(() => []),
    ]).then(([docs, stepsData, progData, mineData]) => {
      if (cancelled) return
      setDocuments(Array.isArray(docs) ? docs : [])
      setSteps(Array.isArray(stepsData) ? stepsData : [])
      setProgress(Array.isArray(progData) ? progData : [])
      setMyDocs(Array.isArray(mineData) ? mineData : [])
    }).finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.step_id))
  const pct = steps.length ? Math.round((completedIds.size / steps.length) * 100) : 0

  const filtered = documents.filter((d) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (d.title || '').toLowerCase().includes(s) || (d.category || '').toLowerCase().includes(s)
  })

  const grouped = filtered.reduce((acc, d) => {
    const k = d.category || 'other'
    if (!acc[k]) acc[k] = []
    acc[k].push(d)
    return acc
  }, {})

  const handleAck = async (id) => {
    try {
      await documentsApi.acknowledge(id)
      setSelected((d) => d ? { ...d, _acknowledged: true } : d)
    } catch {}
  }

  const toggleStep = async (id) => {
    if (completedIds.has(id)) return
    try {
      await documentsApi.completeStep(id)
    } finally {
      setProgress((p) => [...p.filter((x) => x.step_id !== id), { step_id: id, completed: true, completed_at: new Date().toISOString() }])
    }
  }

  const handleUpload = async (file) => {
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    form.append('title', file.name)
    try {
      const res = await documentsApi.upload(form)
      if (res) setMyDocs((prev) => [res, ...prev])
    } catch {}
  }

  if (selected) {
    const cc = getCategory(selected.category)
    const acknowledged = !!selected._acknowledged
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
        >
          <Icon icon="mdi:arrow-left" width={20} /> {t('common.back')}
        </button>
        <div style={{ ...glassStyle, padding: 20 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cc.bg, color: cc.text }}>{cc.label}</span>
            {selected.is_required_reading && (
              <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: 'var(--status-error)' }}>
                {t('docs.requiredReading')}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{selected.title}</h2>
          {selected.summary && (
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>{selected.summary}</p>
          )}
          {selected.content_text && (
            <pre style={{
              fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5,
              fontFamily: 'inherit', whiteSpace: 'pre-wrap', marginBottom: 20,
            }}>{selected.content_text}</pre>
          )}
          {selected.is_required_reading && !acknowledged && (
            <button
              onClick={() => handleAck(selected.id)}
              style={{
                width: '100%', padding: 14, borderRadius: 12,
                background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, minHeight: 48,
              }}
            >
              {t('docs.markRead')}
            </button>
          )}
          {acknowledged && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-success)', fontWeight: 600 }}>
              <Icon icon="mdi:check-circle" width={18} /> {t('docs.acknowledged')}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('docs.title')}</h1>

      <div style={{ ...glassStyle, display: 'flex', padding: 4, marginBottom: 16 }}>
        {TABS.map((tk) => {
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
              {t(`docs.${tk}`)}
            </button>
          )
        })}
      </div>

      {loading && <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>}

      {!loading && tab === 'library' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('docs.search')}
            style={{
              ...glassStyle, padding: '12px 16px', fontSize: 14,
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', minHeight: 48,
            }}
          />
          {Object.keys(grouped).length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('docs.noResults')}</div>
          ) : Object.entries(grouped).map(([cat, docs]) => {
            const cc = getCategory(cat)
            return (
              <div key={cat}>
                <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>{cc.label}</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {docs.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelected(d)}
                      style={{ ...glassStyle, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: 14, fontWeight: 600 }}>{d.title}</h4>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: cc.bg, color: cc.text }}>{cc.label}</span>
                            {d.is_required_reading && (
                              <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.15)', color: 'var(--status-error)' }}>
                                {t('docs.requiredReading')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Icon icon="mdi:chevron-right" width={20} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && tab === 'onboarding' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ ...glassStyle, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{t('docs.progress')}</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{completedIds.size} / {steps.length} · {pct}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width .3s' }} />
            </div>
          </div>

          {steps.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('docs.noOnboarding')}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {steps.map((step) => {
                const done = completedIds.has(step.id)
                return (
                  <button
                    key={step.id}
                    onClick={() => toggleStep(step.id)}
                    style={{ ...glassStyle, padding: 14, textAlign: 'left', cursor: done ? 'default' : 'pointer', color: 'var(--text-primary)' }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 24, height: 24, borderRadius: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 2,
                          background: done ? 'var(--accent-primary)' : 'transparent',
                          border: done ? 'none' : '2px solid var(--text-muted)',
                          color: done ? 'var(--text-on-accent)' : 'transparent',
                        }}
                      >
                        {done && <Icon icon="mdi:check" width={14} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{
                          fontSize: 14, fontWeight: 600,
                          color: done ? 'var(--status-success)' : 'var(--text-primary)',
                          textDecoration: done ? 'line-through' : 'none',
                        }}>
                          {step.title}
                        </h4>
                        {step.description && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{step.description}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!loading && tab === 'myDocs' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <label
            style={{
              width: '100%', padding: 14, borderRadius: 12,
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 48,
            }}
          >
            <Icon icon="mdi:upload" width={20} />
            {t('docs.uploadDoc')}
            <input type="file" onChange={(e) => handleUpload(e.target.files?.[0])} style={{ display: 'none' }} />
          </label>
          {myDocs.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Icon icon="mdi:file-document-outline" width={40} style={{ display: 'block', margin: '0 auto 8px' }} />
              {t('docs.noDocs')}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {myDocs.map((d) => (
                <div key={d.id} style={{ ...glassStyle, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Icon icon="mdi:file-document" width={22} style={{ color: 'var(--accent-primary)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.title || d.filename}
                    </p>
                    {d.uploaded_at && (
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(d.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
