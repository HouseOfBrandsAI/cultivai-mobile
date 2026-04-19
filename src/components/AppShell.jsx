import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import BottomNav from './BottomNav'
import OfflineBanner from './OfflineBanner'

const LANGS = [
  { code: 'en', flag: '🇺🇸', label: 'EN' },
  { code: 'es', flag: '🇪🇸', label: 'ES' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
]

export default function AppShell() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const [langOpen, setLangOpen] = useState(false)

  const initial = (user?.name || user?.email || 'U').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      <OfflineBanner />

      <header
        className="px-4 flex items-center justify-between"
        style={{
          height: 'var(--hdr-h)',
          background: 'var(--topbar-bg)',
          borderBottom: '1px solid var(--border-primary)',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div className="flex items-center gap-2.5">
          <Icon icon="mdi:sprout" width={26} height={26} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1, color: 'var(--accent-primary)' }}>
              {t('login.title')}
            </h1>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('login.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setLangOpen((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                minHeight: 36,
                borderRadius: 999,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-secondary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {LANGS.find((l) => l.code === i18n.language)?.flag || '🇺🇸'}
              <Icon icon="mdi:chevron-down" width={12} />
            </button>
            {langOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: 4,
                  minWidth: 110,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  zIndex: 50,
                }}
              >
                {LANGS.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code)
                      localStorage.setItem('cultivai_lang', lang.code)
                      setLangOpen(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: i18n.language === lang.code ? 'var(--accent-primary)' : 'var(--text-primary)',
                      background: i18n.language === lang.code ? 'var(--accent-bg)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            aria-label="User"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--ai-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--text-on-accent)',
            }}
          >
            {initial}
          </div>

          <button
            onClick={() => { logout(); navigate('/login') }}
            aria-label="Logout"
            style={{
              minWidth: 44,
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <Icon icon="mdi:logout" width={20} />
          </button>
        </div>
      </header>

      <main
        className="flex-1 overflow-y-auto"
        style={{
          padding: 16,
          paddingBottom: 'calc(var(--tab-h) + var(--safe-b) + 16px)',
          maxWidth: 1024,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <Outlet />
      </main>

      <BottomNav />
    </div>
  )
}
