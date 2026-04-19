import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { documentsApi } from '../../api/endpoints'
import { glassStyle } from '../../components/GlassCard'

const CATEGORIES = ['sop', 'safety', 'training', 'equipment', 'hr', 'compliance', 'other']

export default function AdminDocuments() {
  const { t } = useTranslation()
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', category: 'sop', content_text: '', is_required_reading: false, published: true })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    documentsApi.list()
      .then((d) => setDocs(Array.isArray(d) ? d : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ title: '', category: 'sop', content_text: '', is_required_reading: false, published: true })
    setShowForm(true)
  }

  const openEdit = (doc) => {
    setEditing(doc)
    setForm({
      title: doc.title || '',
      category: doc.category || 'sop',
      content_text: doc.content_text || '',
      is_required_reading: !!doc.is_required_reading,
      published: doc.published !== false,
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (editing?.id) {
        await documentsApi.update(editing.id, form)
      } else {
        await documentsApi.create(form)
      }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (doc) => {
    try {
      await documentsApi.update(doc.id, { published: !doc.published })
      setDocs((prev) => prev.map((d) => d.id === doc.id ? { ...d, published: !doc.published } : d))
    } catch {}
  }

  const remove = async (doc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return
    try {
      await documentsApi.remove(doc.id)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch {}
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{t('admin.documents')}</h1>
        <button
          onClick={openNew}
          style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            minHeight: 44, display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Icon icon="mdi:plus" width={18} /> {t('admin.newDocument')}
        </button>
      </div>

      {loading ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      ) : docs.length === 0 ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
      ) : (
        <div style={{ display: 'grid', gap: 6 }}>
          {docs.map((d) => (
            <div key={d.id} style={{ ...glassStyle, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Icon icon="mdi:file-document" width={22} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.title}</h4>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 11 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {d.category || 'other'}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                      background: d.published ? 'rgba(74,222,128,0.15)' : 'var(--bg-tertiary)',
                      color: d.published ? '#4ade80' : 'var(--text-muted)',
                    }}>
                      {d.published ? 'Published' : 'Draft'}
                    </span>
                    {d.is_required_reading && (
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: 'var(--status-error)', fontWeight: 600 }}>
                        Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => openEdit(d)} style={actionBtn}><Icon icon="mdi:pencil" width={16} /> {t('common.edit')}</button>
                <button onClick={() => togglePublish(d)} style={actionBtn}>
                  <Icon icon={d.published ? 'mdi:eye-off' : 'mdi:eye'} width={16} />
                  {d.published ? t('admin.unpublish') : t('admin.publish')}
                </button>
                <button onClick={() => remove(d)} style={{ ...actionBtn, color: 'var(--status-error)' }}><Icon icon="mdi:trash-can-outline" width={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title={editing ? t('common.edit') : t('admin.newDocument')}>
          <div style={{ display: 'grid', gap: 12 }}>
            <Field label={t('admin.title')}>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label={t('admin.category')}>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
              </select>
            </Field>
            <Field label={t('admin.content')}>
              <textarea rows={6} value={form.content_text} onChange={(e) => setForm((f) => ({ ...f, content_text: e.target.value }))} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13, minHeight: 36, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_required_reading} onChange={(e) => setForm((f) => ({ ...f, is_required_reading: e.target.checked }))} style={{ accentColor: 'var(--accent-primary)' }} />
              {t('admin.requiredReading')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13, minHeight: 36, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} style={{ accentColor: 'var(--accent-primary)' }} />
              Published
            </label>
            <button
              onClick={save}
              disabled={saving || !form.title.trim()}
              style={saveBtn(saving || !form.title.trim())}
            >
              {saving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const actionBtn = {
  padding: '6px 10px', borderRadius: 8,
  background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
  border: '1px solid var(--border-secondary)', cursor: 'pointer',
  fontSize: 12, fontWeight: 600, minHeight: 36,
  display: 'flex', alignItems: 'center', gap: 4,
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
  color: 'var(--text-primary)', fontSize: 14, outline: 'none',
}

const saveBtn = (disabled) => ({
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
          width: '100%', maxWidth: 520,
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
