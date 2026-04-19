import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import { teamApi } from '../api/endpoints'
import { glassStyle } from '../components/GlassCard'
import { relativeTime, formatDate } from '../utils/dateFormat'

const TABS = ['feed', 'rewards', 'directory']

const BADGES = ['star_performer', 'team_player', 'safety_champion', 'green_thumb', 'hard_worker']

const BADGE_META = {
  star_performer:  { label: 'Star Performer',  emoji: '⭐' },
  team_player:     { label: 'Team Player',     emoji: '🤝' },
  safety_champion: { label: 'Safety Champion', emoji: '🛡️' },
  green_thumb:     { label: 'Green Thumb',     emoji: '🌱' },
  hard_worker:     { label: 'Hard Worker',     emoji: '💪' },
}

const POST_ICONS = {
  recognition:  '🏆',
  celebration:  '🎂',
  anniversary:  '📅',
  announcement: '📢',
}

export default function Team() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('feed')
  const [search, setSearch] = useState('')
  const [directory, setDirectory] = useState([])
  const [feed, setFeed] = useState([])
  const [catalog, setCatalog] = useState([])
  const [points, setPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [showRec, setShowRec] = useState(false)
  const [rec, setRec] = useState({ to: '', message: '', badge: '' })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    teamApi.directory().then((d) => setDirectory(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    if (tab === 'feed') {
      teamApi.feed().then((d) => !cancelled && setFeed(Array.isArray(d) ? d : [])).catch(() => {}).finally(() => !cancelled && setLoading(false))
    } else if (tab === 'rewards') {
      Promise.all([teamApi.rewardsBalance(), teamApi.rewardsCatalog()])
        .then(([bal, cat]) => {
          if (cancelled) return
          setPoints(bal?.points_balance ?? 0)
          setCatalog(Array.isArray(cat) ? cat : [])
        })
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false))
    } else {
      setLoading(false)
    }
    return () => { cancelled = true }
  }, [tab])

  const sendRec = async () => {
    if (!rec.to || !rec.message.trim()) return
    setSending(true)
    try {
      const post = await teamApi.postRecognition({
        to_user_id: rec.to,
        content: rec.message.trim(),
        badge: rec.badge || null,
      })
      if (post?.id) setFeed((prev) => [post, ...prev])
    } finally {
      setSending(false)
      setShowRec(false)
      setRec({ to: '', message: '', badge: '' })
    }
  }

  const redeem = async (reward) => {
    if (points < reward.points_cost) return
    try {
      const res = await teamApi.redeemReward(reward.id)
      if (typeof res?.points_balance === 'number') setPoints(res.points_balance)
    } catch {}
  }

  const react = async (postId) => {
    setFeed((prev) => prev.map((p) => p.id === postId
      ? { ...p, reacted_by_me: !p.reacted_by_me, reactions: (p.reactions || 0) + (p.reacted_by_me ? -1 : 1) }
      : p))
    try { await teamApi.react(postId) } catch {}
  }

  const filtered = directory.filter((m) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (m.name || '').toLowerCase().includes(s) || (m.role || '').toLowerCase().includes(s)
  })

  const initial = (n) => (n || '?').charAt(0).toUpperCase()

  if (profile) {
    return (
      <div>
        <button
          onClick={() => setProfile(null)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', marginBottom: 12 }}
        >
          <Icon icon="mdi:arrow-left" width={20} /> {t('common.back')}
        </button>
        <div style={{ ...glassStyle, padding: 24, textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 12px',
            background: 'var(--accent-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: 'var(--text-on-accent)',
          }}>
            {initial(profile.name)}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.name}</h2>
          {profile.role && (
            <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
              {profile.role}
            </span>
          )}
          <div style={{ marginTop: 20, display: 'grid', gap: 8, textAlign: 'left' }}>
            {[
              { label: t('team.role'), value: profile.role },
              { label: t('team.startDate'), value: profile.start_date ? formatDate(profile.start_date) : '—' },
              { label: t('team.email'), value: profile.email },
              { label: t('team.phone'), value: profile.phone },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: 12, borderRadius: 10, background: 'var(--bg-secondary)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{row.value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>{t('team.title')}</h1>

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
              {t(`team.${tk}`)}
            </button>
          )
        })}
      </div>

      {tab === 'feed' && (
        <div style={{ display: 'grid', gap: 8, position: 'relative' }}>
          {loading ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : feed.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
          ) : feed.map((post) => {
            const badgeMeta = post.badge ? BADGE_META[post.badge] : null
            return (
              <div key={post.id} style={{ ...glassStyle, padding: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--text-on-accent)',
                    flexShrink: 0,
                  }}>
                    {initial(post.from_user?.name || post.to_user?.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{POST_ICONS[post.type] || '📌'}</span>
                      {post.type === 'recognition' && post.from_user?.name && post.to_user?.name ? (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{post.from_user.name}</strong>
                          {' '}{t('team.recognized')}{' '}
                          <strong style={{ color: 'var(--text-primary)' }}>{post.to_user.name}</strong>
                        </p>
                      ) : (
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {post.from_user?.name || post.to_user?.name || ''}
                        </p>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{post.content}</p>
                    {badgeMeta && (
                      <span style={{
                        display: 'inline-block', marginTop: 6,
                        padding: '2px 8px', borderRadius: 6,
                        fontSize: 11, fontWeight: 600,
                        background: 'rgba(251,191,36,0.15)', color: '#fbbf24',
                      }}>
                        {badgeMeta.emoji} {badgeMeta.label}
                      </span>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{relativeTime(post.created_at)}</span>
                      <button
                        onClick={() => react(post.id)}
                        style={{
                          minHeight: 36, padding: '0 8px',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: post.reacted_by_me ? '#facc15' : 'var(--text-muted)',
                          fontSize: 13,
                        }}
                      >
                        👏 {post.reactions || 0}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          <button
            onClick={() => setShowRec(true)}
            style={{
              position: 'fixed', bottom: 'calc(var(--tab-h) + var(--safe-b) + 16px)', right: 16,
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(132,255,100,0.3)',
              zIndex: 40,
            }}
            aria-label={t('team.giveRecognition')}
          >
            <Icon icon="mdi:plus" width={26} />
          </button>
        </div>
      )}

      {tab === 'rewards' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ ...glassStyle, padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('team.yourBalance')}</p>
            <p style={{ fontSize: 38, fontWeight: 800, color: 'var(--status-success)', marginTop: 4 }}>{points}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{t('team.points')}</p>
          </div>
          {loading ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.loading')}</div>
          ) : catalog.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
          ) : catalog.map((r) => (
            <div key={r.id} style={{ ...glassStyle, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</h4>
                  {r.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.description}</p>}
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--status-success)', marginTop: 6 }}>
                    {r.points_cost} {t('team.points')}
                  </p>
                </div>
                <button
                  onClick={() => redeem(r)}
                  disabled={points < r.points_cost}
                  style={{
                    padding: '8px 14px', borderRadius: 10,
                    background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                    border: 'none', cursor: points >= r.points_cost ? 'pointer' : 'not-allowed',
                    opacity: points >= r.points_cost ? 1 : 0.4,
                    fontSize: 13, fontWeight: 600, minHeight: 40,
                  }}
                >
                  {t('team.redeem')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'directory' && (
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('team.search')}
            style={{
              ...glassStyle, padding: '12px 16px', fontSize: 14,
              background: 'var(--bg-secondary)', color: 'var(--text-primary)',
              outline: 'none', minHeight: 48,
            }}
          />
          {filtered.length === 0 ? (
            <div style={{ ...glassStyle, padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>{t('common.noData')}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setProfile(m)}
                  style={{ ...glassStyle, padding: 14, textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700,
                    }}>
                      {initial(m.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</h4>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 12, color: 'var(--text-muted)' }}>
                        {m.role && <span>{m.role}</span>}
                        {m.room && <span>{m.room}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showRec && (
        <div
          onClick={() => setShowRec(false)}
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
              maxHeight: '85vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{t('team.giveRecognition')}</h3>
              <button onClick={() => setShowRec(false)} style={{ minWidth: 44, minHeight: 44, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label="Close">
                <Icon icon="mdi:close" width={22} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('team.selectEmployee')}</label>
                <select
                  value={rec.to}
                  onChange={(e) => setRec((r) => ({ ...r, to: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none',
                  }}
                >
                  <option value="">{t('team.selectEmployee')}</option>
                  {directory.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('team.message')}</label>
                <textarea
                  rows={3}
                  value={rec.message}
                  onChange={(e) => setRec((r) => ({ ...r, message: e.target.value }))}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)',
                    color: 'var(--text-primary)', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{t('team.badge')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {BADGES.map((b) => {
                    const meta = BADGE_META[b]
                    const active = rec.badge === b
                    return (
                      <button
                        key={b}
                        onClick={() => setRec((r) => ({ ...r, badge: active ? '' : b }))}
                        style={{
                          padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                          background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: active ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                          border: 'none', cursor: 'pointer', minHeight: 36,
                        }}
                      >
                        {meta.emoji} {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button
                onClick={sendRec}
                disabled={!rec.to || !rec.message.trim() || sending}
                style={{
                  padding: 14, borderRadius: 12,
                  background: 'var(--accent-primary)', color: 'var(--text-on-accent)',
                  border: 'none', cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, minHeight: 48,
                  opacity: (!rec.to || !rec.message.trim() || sending) ? 0.5 : 1,
                }}
              >
                {sending ? t('common.loading') : t('team.send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
