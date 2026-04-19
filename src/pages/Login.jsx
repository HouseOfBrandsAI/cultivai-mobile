import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' },
  { code: 'pt', label: 'PT' },
]

export default function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const login = useAuthStore((s) => s.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      if (remember) localStorage.setItem('cultivai_remember', '1')
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(err?.response?.data?.detail || t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(132,255,100,0.06) 0%, transparent 70%), var(--bg-primary)',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
          background: 'var(--ai-gradient)',
          fontSize: 40,
        }}
      >
        🌱
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          background: 'var(--ai-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {t('login.title')}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
        {t('login.subtitle')}
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380 }}>
        <input
          type="text"
          autoComplete="username"
          placeholder={t('login.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: 14,
            fontSize: 15,
            color: 'var(--text-primary)',
            marginBottom: 12,
            outline: 'none',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '16px 18px',
            borderRadius: 14,
            fontSize: 15,
            color: 'var(--text-primary)',
            marginBottom: 12,
            outline: 'none',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-primary)',
          }}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--text-muted)',
            fontSize: 13,
            marginBottom: 12,
            cursor: 'pointer',
            minHeight: 36,
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: 'var(--accent-primary)' }}
          />
          {t('login.remember')}
        </label>

        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              marginBottom: 12,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: 'var(--status-error)',
              fontSize: 13,
            }}
          >
            <Icon icon="mdi:alert-circle-outline" width={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: 16,
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            marginTop: 8,
            minHeight: 56,
            border: 'none',
            background: 'var(--accent-primary)',
            color: 'var(--text-on-accent)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? t('common.loading') : t('login.submit')}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
        {LANGS.map((lang) => {
          const active = i18n.language === lang.code
          return (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code)
                localStorage.setItem('cultivai_lang', lang.code)
              }}
              type="button"
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                minHeight: 36,
                background: active ? 'var(--accent-glow)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                border: `1px solid ${active ? 'var(--border-active)' : 'var(--border-primary)'}`,
                cursor: 'pointer',
              }}
            >
              {lang.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
