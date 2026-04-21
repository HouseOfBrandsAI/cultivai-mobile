import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { tasksApi, chatApi } from '../api/endpoints'
import { normalizeStatus } from '../constants/ops'

const MAIN_TABS = [
  { key: 'home',  icon: 'mdi:home-outline',              path: '/' },
  { key: 'chat',  icon: 'mdi:chat-outline',              path: '/chat',  badge: 'chat' },
  { key: 'tasks', icon: 'mdi:check-circle-outline',      path: '/tasks', badge: 'tasks' },
  { key: 'docs',  icon: 'mdi:file-document-outline',     path: '/docs' },
  { key: 'more',  icon: 'mdi:menu',                      path: null },
]

const MORE_LINKS = [
  { key: 'inbox',     icon: 'mdi:inbox-outline',          path: '/inbox' },
  { key: 'schedule',  icon: 'mdi:calendar-clock-outline', path: '/schedule' },
  { key: 'team',      icon: 'mdi:account-group-outline',  path: '/team' },
  { key: 'forms',     icon: 'mdi:clipboard-text-outline', path: '/forms' },
  { key: 'assistant', icon: 'mdi:robot-outline',          path: '/assistant' },
  { key: 'settings',  icon: 'mdi:cog-outline',            path: '/settings' },
]

const ADMIN_LINKS = [
  { key: 'adminDocs',     icon: 'mdi:file-cog-outline',          path: '/admin/documents', label: 'Admin: Documents' },
  { key: 'adminSchedule', icon: 'mdi:calendar-edit-outline',     path: '/admin/schedule',  label: 'Admin: Schedule' },
  { key: 'adminTeam',     icon: 'mdi:account-cog-outline',       path: '/admin/team',      label: 'Admin: Team' },
]

export default function BottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [badges, setBadges] = useState({ tasks: 0, chat: 0 })

  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  /* Lightweight polling for the two badge counts. Silently fails offline. */
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    const load = async () => {
      try {
        const [tasks, convs] = await Promise.all([
          tasksApi.list({ assignee: user.id }).catch(() => []),
          chatApi.conversations().catch(() => []),
        ])
        if (cancelled) return
        const today = new Date()
        const isOverdueOrToday = (tk) => {
          if (!tk.due_date) return false
          const d = new Date(tk.due_date)
          if (Number.isNaN(d.getTime())) return false
          const status = normalizeStatus(tk.status)
          if (status === 'done') return false
          return d <= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
        }
        const tasksCount = (Array.isArray(tasks) ? tasks : [])
          .filter((tk) => !tk.assigned_to || tk.assigned_to === user.id)
          .filter(isOverdueOrToday)
          .length
        const chatCount = (Array.isArray(convs) ? convs : [])
          .reduce((sum, c) => sum + (c.unread_count || 0), 0)
        setBadges({ tasks: tasksCount, chat: chatCount })
      } catch {
        /* ignore */
      }
    }
    load()
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [user?.id])

  const isActive = (path) => {
    if (!path) return false
    if (path === '/') return location.pathname === '/'
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 flex items-center"
        style={{
          height: 'calc(var(--tab-h) + var(--safe-b))',
          paddingBottom: 'var(--safe-b)',
          background: 'rgba(10, 15, 10, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--border-primary)',
          zIndex: 60,
          maxWidth: 1024,
          margin: '0 auto',
        }}
      >
        {MAIN_TABS.map((tab) => {
          const active = isActive(tab.path)
          const badgeCount = tab.badge ? (badges[tab.badge] || 0) : 0
          const content = (
            <>
              <div style={{ position: 'relative' }}>
                <Icon
                  icon={tab.icon}
                  width={22}
                  height={22}
                  style={{ color: active ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                />
                {badgeCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      padding: '0 4px',
                      borderRadius: 8,
                      background: 'var(--status-error)',
                      color: '#ffffff',
                      fontSize: 9,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              >
                {t(`mobile.${tab.key}`)}
              </span>
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    top: -1,
                    left: '25%',
                    right: '25%',
                    height: 2,
                    background: 'var(--accent-primary)',
                    borderRadius: '0 0 2px 2px',
                  }}
                />
              )}
            </>
          )
          const common = {
            style: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '8px 0',
              position: 'relative',
              minHeight: 48,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            },
          }

          if (tab.path) {
            return (
              <Link key={tab.key} to={tab.path} {...common}>
                {content}
              </Link>
            )
          }
          return (
            <button key={tab.key} {...common} onClick={() => setDrawerOpen(true)}>
              {content}
            </button>
          )
        })}
      </nav>

      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 70,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 1024,
              margin: '0 auto',
              background: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-primary)',
              borderRadius: '20px 20px 0 0',
              padding: '20px 16px calc(var(--safe-b) + 20px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <span style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-primary)' }} />
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 10 }}>
              {t('mobile.more')}
            </h3>
            <div style={{ display: 'grid', gap: 4 }}>
              {MORE_LINKS.map((link) => (
                <Link
                  key={link.key}
                  to={link.path}
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 12px',
                    borderRadius: 12,
                    color: 'var(--text-primary)',
                    textDecoration: 'none',
                    minHeight: 48,
                  }}
                >
                  <Icon icon={link.icon} width={22} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: 15, fontWeight: 600 }}>{t(`mobile.${link.key}`)}</span>
                </Link>
              ))}
            </div>

            {isAdmin && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '20px 0 10px' }}>
                  Admin
                </h3>
                <div style={{ display: 'grid', gap: 4 }}>
                  {ADMIN_LINKS.map((link) => (
                    <Link
                      key={link.key}
                      to={link.path}
                      onClick={() => setDrawerOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 12px',
                        borderRadius: 12,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        minHeight: 48,
                      }}
                    >
                      <Icon icon={link.icon} width={22} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{link.label}</span>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
