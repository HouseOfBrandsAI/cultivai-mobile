import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@iconify/react'
import useAuthStore from '../stores/useAuthStore'
import { meApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'

/**
 * Personal settings only.
 *
 * Tenant-level configuration (Notion tokens, Google OAuth, SMTP, role
 * management) lives in the web Admin portal — NOT here. See Part E of
 * the mobile-ops-sync prompt.
 */

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
]

export default function Settings() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  const [allowPreview, setAllowPreview] = useState(!!user?.allow_live_preview)
  const [displayName, setDisplayName] = useState(user?.name || '')
  const [notifyBroadcasts, setNotifyBroadcasts] = useState(user?.notify_prefs?.broadcasts ?? true)
  const [notifyNudges, setNotifyNudges] = useState(user?.notify_prefs?.nudges ?? true)
  const [notifyUrgent, setNotifyUrgent] = useState(user?.notify_prefs?.urgent ?? true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const patch = async (body, label) => {
    setSaving(true)
    try {
      await meApi.updateSettings(body)
      await fetchMe()
      setToast(`${label} updated`)
      setTimeout(() => setToast(''), 2000)
    } catch {
      setToast('Save failed — try again')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const togglePreview = (v) => {
    setAllowPreview(v)
    patch({ allow_live_preview: v }, 'Live preview opt-in')
  }

  const toggleNotify = (key, v) => {
    if (key === 'broadcasts') setNotifyBroadcasts(v)
    if (key === 'nudges') setNotifyNudges(v)
    if (key === 'urgent') setNotifyUrgent(v)
    const next = {
      broadcasts: key === 'broadcasts' ? v : notifyBroadcasts,
      nudges: key === 'nudges' ? v : notifyNudges,
      urgent: key === 'urgent' ? v : notifyUrgent,
    }
    patch({ notify_prefs: next }, 'Notification prefs')
  }

  const saveDisplayName = () => {
    if (displayName.trim() === (user?.name || '')) return
    patch({ display_name: displayName.trim() }, 'Display name')
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Settings</h1>

      {/* ---- Account ---- */}
      <Section icon="mdi:account-circle-outline" label="Account">
        <Row>
          <Label>Display name</Label>
          <div style={{ display: 'flex', gap: 6, flex: 1 }}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onBlur={saveDisplayName}
              style={inputStyle}
            />
          </div>
        </Row>
        <Row>
          <Label>Email</Label>
          <span style={valueStyle}>{user?.email || '—'}</span>
        </Row>
        <Row>
          <Label>Role</Label>
          <span style={valueStyle}>{user?.role || '—'}</span>
        </Row>
      </Section>

      {/* ---- Live preview opt-in ---- */}
      <Section icon="mdi:eye-outline" label="Manager live preview">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          If enabled, a manager can view a read-only snapshot of your home screen during your shift.
          You'll see a banner every time it happens. Every view is audit-logged.
        </p>
        <Toggle
          checked={allowPreview}
          onChange={togglePreview}
          label={allowPreview ? 'Opt-in enabled' : 'Opt-in disabled'}
        />
      </Section>

      {/* ---- Notifications ---- */}
      <Section icon="mdi:bell-outline" label="Notifications">
        <Toggle checked={notifyBroadcasts} onChange={(v) => toggleNotify('broadcasts', v)} label="Broadcasts & announcements" />
        <Toggle checked={notifyNudges}     onChange={(v) => toggleNotify('nudges', v)}     label="Nudges (manager pings)" />
        <Toggle checked={notifyUrgent}     onChange={(v) => toggleNotify('urgent', v)}     label="Urgent coverage gaps (bypasses DND)" />
      </Section>

      {/* ---- Language ---- */}
      <Section icon="mdi:translate" label="Language">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {LANGS.map((lang) => {
            const active = i18n.language === lang.code
            return (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code)
                  localStorage.setItem('cultivai_lang', lang.code)
                }}
                style={{
                  padding: '8px 14px', borderRadius: 999,
                  fontSize: 13, fontWeight: 600,
                  background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-primary)',
                  cursor: 'pointer', minHeight: 40,
                }}
              >
                {lang.label}
              </button>
            )
          })}
        </div>
      </Section>

      {/* ---- About / tenant config pointer ---- */}
      <Section icon="mdi:information-outline" label="Tenant configuration">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Integrations (Google Calendar, Notion, email), roles, and tenant settings are managed
          in the web Admin portal. Ask your manager for access.
        </p>
      </Section>

      {/* ---- Actions ---- */}
      <Section icon="mdi:exit-to-app" label="Session">
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{
            padding: '10px 14px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--status-error)',
            color: 'var(--status-error)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, minHeight: 40,
          }}
        >
          <Icon icon="mdi:logout" width={14} style={{ verticalAlign: '-3px', marginRight: 4 }} />
          Sign out
        </button>
      </Section>

      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', left: '50%', transform: 'translateX(-50%)',
            bottom: 'calc(var(--tab-h) + var(--safe-b) + 16px)',
            padding: '10px 16px', borderRadius: 999,
            background: 'var(--bg-secondary)', color: 'var(--text-primary)',
            border: '1px solid var(--border-active)',
            fontSize: 13, fontWeight: 600, zIndex: 80,
          }}
        >
          {saving ? 'Saving…' : toast}
        </div>
      )}
    </div>
  )
}

/* ---------- bits ---------- */

function Section({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
        color: 'var(--text-muted)', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Icon icon={icon} width={14} />
        {label}
      </h3>
      <div style={{ ...glassStyle, padding: 14 }}>{children}</div>
    </div>
  )
}

function Row({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', minHeight: 40 }}>
      {children}
    </div>
  )
}

function Label({ children }) {
  return (
    <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 110, flexShrink: 0 }}>{children}</span>
  )
}

const valueStyle = {
  flex: 1,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--text-primary)',
  textAlign: 'right',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const inputStyle = {
  flex: 1,
  padding: '8px 12px',
  borderRadius: 10,
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border-secondary)',
  color: 'var(--text-primary)',
  fontSize: 14,
  outline: 'none',
}

function Toggle({ checked, onChange, label }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', cursor: 'pointer', minHeight: 44,
    }}>
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          position: 'relative', width: 42, height: 24,
          borderRadius: 12, flexShrink: 0,
          background: checked ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
          border: '1px solid var(--border-primary)',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: checked ? 'var(--text-on-accent)' : 'var(--text-muted)',
          transition: 'left 0.15s',
        }} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
        {label}
      </span>
    </label>
  )
}
