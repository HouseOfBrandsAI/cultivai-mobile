import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { assistantApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'

export default function Assistant() {
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ask = async (e) => {
    e?.preventDefault()
    if (!question.trim() || loading) return
    setLoading(true)
    setError('')
    setAnswer(null)
    setSources([])
    try {
      const res = await assistantApi.ask(question.trim())
      setAnswer(res?.answer || res?.text || JSON.stringify(res))
      setSources(Array.isArray(res?.sources) ? res.sources : [])
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to get an answer — try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('assistant.title')}</h1>

      <form onSubmit={ask} style={{ ...glassStyle, padding: 12, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <Icon icon="mdi:robot-outline" width={22} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('assistant.placeholder')}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 14, color: 'var(--text-primary)',
            padding: '8px 0',
          }}
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          style={{
            padding: '8px 14px', borderRadius: 10,
            background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700, minHeight: 40,
            opacity: (!question.trim() || loading) ? 0.5 : 1,
          }}
        >
          {t('assistant.ask')}
        </button>
      </form>

      {loading && (
        <div style={{ ...glassStyle, padding: 24, textAlign: 'center', color: 'var(--accent-primary)' }}>
          <Icon icon="mdi:loading" width={24} style={{ verticalAlign: '-5px', marginRight: 6 }} />
          {t('assistant.thinking')}
        </div>
      )}

      {error && (
        <div style={{ ...glassStyle, padding: 16, borderColor: 'rgba(239,68,68,0.35)', color: 'var(--status-error)' }}>
          <Icon icon="mdi:alert-circle-outline" width={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          {error}
        </div>
      )}

      {!loading && !answer && !error && (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('assistant.noAnswer')}
        </div>
      )}

      {answer && (
        <div style={{ ...glassStyle, padding: 20, marginBottom: 16 }}>
          <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{answer}</p>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
            {t('assistant.sources')}
          </h3>
          <div style={{ display: 'grid', gap: 6 }}>
            {sources.map((src, i) => (
              <div key={src.id || i} style={{ ...glassStyle, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon icon="mdi:file-document-outline" width={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{src.title || src.name || `Source ${i + 1}`}</span>
                </div>
                {src.snippet && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{src.snippet}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
