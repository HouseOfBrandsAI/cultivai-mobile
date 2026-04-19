import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { chatApi, usersApi } from '../api/endpoints'
import useAuthStore from '../stores/useAuthStore'
import { formatTime } from '../utils/dateFormat'
import { glassStyle } from '../components/GlassCard'

export default function Chat() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const [selected, setSelected] = useState(null)
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    chatApi.conversations()
      .then((data) => { if (!cancelled) setConversations(Array.isArray(data) ? data : []) })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!selected) return
    chatApi.messages(selected.id)
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
    chatApi.markRead(selected.id).catch(() => {})
    setConversations((prev) => prev.map((c) => c.id === selected.id ? { ...c, unread_count: 0 } : c))
  }, [selected])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || !selected) return
    setDraft('')
    const optimistic = {
      id: `tmp-${Date.now()}`,
      text,
      sender_id: user?.id,
      sender_name: user?.name,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimistic])
    try {
      const saved = await chatApi.sendMessage(selected.id, { text })
      if (saved?.id) {
        setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), saved])
      }
    } catch {
      // keep optimistic
    }
  }

  const handleCreate = async (payload) => {
    try {
      const created = await chatApi.createConversation(payload)
      if (created?.id) {
        setConversations((prev) => [created, ...prev])
        setSelected(created)
      }
    } finally {
      setShowNew(false)
    }
  }

  if (selected) {
    const isOwn = (m) => m.sender_id === user?.id
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - var(--hdr-h) - var(--tab-h) - 32px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12 }}>
          <button
            onClick={() => { setSelected(null); setMessages([]) }}
            style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <Icon icon="mdi:arrow-left" width={24} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{selected.name}</h2>
            {selected.members_count ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.members_count} members</p>
            ) : null}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 14 }}>
              {t('chat.noMessages')}
            </div>
          ) : messages.map((m) => (
            <div key={m.id} style={{ display: 'flex', justifyContent: isOwn(m) ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '80%',
                  borderRadius: 16,
                  padding: '10px 14px',
                  background: isOwn(m) ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                  border: `1px solid ${isOwn(m) ? 'var(--border-active)' : 'var(--border-primary)'}`,
                }}
              >
                {!isOwn(m) && (
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-primary)', marginBottom: 2 }}>
                    {m.sender_name}
                  </p>
                )}
                <p style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{m.text}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {formatTime(m.created_at)}
                </p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div style={{ paddingTop: 8 }}>
          <div style={{ ...glassStyle, display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 12px', borderRadius: 24 }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder={t('chat.typeMessage')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                color: 'var(--text-primary)',
                padding: '10px 0',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim()}
              style={{
                minWidth: 44,
                minHeight: 44,
                border: 'none',
                background: 'transparent',
                cursor: draft.trim() ? 'pointer' : 'not-allowed',
                color: 'var(--accent-primary)',
                opacity: draft.trim() ? 1 : 0.35,
              }}
              aria-label={t('chat.send')}
            >
              <Icon icon="mdi:send" width={22} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>{t('chat.title')}</h1>
        <button
          onClick={() => setShowNew(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 14px', borderRadius: 12,
            background: 'var(--accent-bg)', border: '1px solid var(--border-active)',
            color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            minHeight: 44,
          }}
        >
          <Icon icon="mdi:plus" width={18} /> {t('chat.newChat')}
        </button>
      </div>

      {loading ? (
        <div style={{ ...glassStyle, padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
      ) : conversations.length === 0 ? (
        <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon icon="mdi:chat-outline" width={40} style={{ display: 'block', margin: '0 auto 8px' }} />
          {t('chat.noMessages')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              style={{ ...glassStyle, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)', minHeight: 60 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    {c.unread_count > 0 && (
                      <span style={{
                        minWidth: 20, height: 20, borderRadius: 10,
                        background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                        fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
                      }}>
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message || t('chat.noMessages')}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(c.last_message_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showNew && <NewChatModal currentUserId={user?.id} onClose={() => setShowNew(false)} onCreate={handleCreate} />}
    </div>
  )
}

function NewChatModal({ currentUserId, onClose, onCreate }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState('direct')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    usersApi.list()
      .then((data) => setUsers((Array.isArray(data) ? data : []).filter((u) => u.id !== currentUserId)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [currentUserId])

  const canCreate = selected.length > 0 && (mode === 'direct' || name.trim())

  const submit = async () => {
    if (!canCreate || creating) return
    setCreating(true)
    await onCreate({
      name: mode === 'group' ? name.trim() : null,
      conv_type: mode,
      participant_ids: selected,
    })
    setCreating(false)
  }

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
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t('chat.newChat')}</h3>
          <button onClick={onClose} style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Close">
            <Icon icon="mdi:close" width={22} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['direct', 'group'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setSelected([]); setName('') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10,
                fontSize: 13, fontWeight: 600,
                background: mode === m ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: mode === m ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                border: 'none', cursor: 'pointer', minHeight: 40,
              }}
            >
              {t(`chat.${m}`)}
            </button>
          ))}
        </div>

        {mode === 'group' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('chat.groupName')}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
              color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              marginBottom: 12,
            }}
          />
        )}

        <div style={{ display: 'grid', gap: 4, marginBottom: 16 }}>
          {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 16, fontSize: 14 }}>{t('common.loading')}</p>}
          {!loading && users.map((u) => {
            const on = selected.includes(u.id)
            return (
              <button
                key={u.id}
                onClick={() => {
                  setSelected((prev) => mode === 'direct' ? [u.id] : prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id])
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', borderRadius: 10,
                  background: on ? 'var(--accent-bg)' : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left', minHeight: 44,
                  color: 'var(--text-primary)', fontSize: 14,
                }}
              >
                {u.name || u.email}
                {on && <Icon icon="mdi:check-circle" style={{ color: 'var(--accent-primary)' }} width={20} />}
              </button>
            )
          })}
        </div>

        <button
          onClick={submit}
          disabled={!canCreate || creating}
          style={{
            width: '100%', padding: 12, borderRadius: 12,
            background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
            border: 'none', cursor: canCreate ? 'pointer' : 'not-allowed',
            fontSize: 15, fontWeight: 700, minHeight: 48,
            opacity: canCreate ? 1 : 0.5,
          }}
        >
          {creating ? t('common.loading') : t('chat.create')}
        </button>
      </div>
    </div>
  )
}
