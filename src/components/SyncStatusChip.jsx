import { Icon } from '@iconify/react'

/**
 * SyncStatusChip — shared read-only indicator for external integration sync state.
 *
 * Used by:
 *   - Schedule shift cards (Google / Outlook / Apple Calendar — Part B)
 *   - Task detail (Notion task sync — Part D)
 *
 * Kept tiny & color-coded to match the desktop prototype's sync pills.
 * Mobile NEVER initiates the sync itself — backend fan-out runs from the
 * manager's connected tenant. This chip only reports state.
 */

const PROVIDER_ICON = {
  google:  'mdi:google',
  outlook: 'mdi:microsoft-outlook',
  apple:   'mdi:apple',
  notion:  'mdi:notebook-outline',
}

const STATUS_VISUAL = {
  synced:  { color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.35)',  icon: 'mdi:check-circle' },
  pending: { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.35)',  icon: 'mdi:clock-outline' },
  error:   { color: '#f87171', bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.35)',   icon: 'mdi:alert-circle-outline' },
  none:    { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)',  icon: 'mdi:minus-circle-outline' },
}

const LABEL_DEFAULT = {
  google:  { synced: 'On Google',  pending: 'Syncing…', error: 'Sync error', none: 'Not synced' },
  outlook: { synced: 'On Outlook', pending: 'Syncing…', error: 'Sync error', none: 'Not synced' },
  apple:   { synced: 'On Apple',   pending: 'Syncing…', error: 'Sync error', none: 'Not synced' },
  notion:  { synced: 'Notion',     pending: 'Syncing…', error: 'Notion error', none: 'Not synced' },
}

export default function SyncStatusChip({
  provider = 'google',
  status = 'none',
  lastUpdate,
  errorText,
  size = 'sm',
  onClick,
}) {
  const visual = STATUS_VISUAL[status] || STATUS_VISUAL.none
  const label = LABEL_DEFAULT[provider]?.[status] || status
  const tip = status === 'synced' && lastUpdate
    ? `synced · last update ${lastUpdate}`
    : status === 'error' && errorText
      ? errorText
      : undefined

  const padY = size === 'xs' ? 1 : 2
  const fontSize = size === 'xs' ? 10 : 11
  const iconSize = size === 'xs' ? 11 : 12
  const providerIcon = PROVIDER_ICON[provider]

  const Tag = onClick ? 'button' : 'span'

  return (
    <Tag
      onClick={onClick}
      title={tip}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: `${padY}px 8px`,
        borderRadius: 999,
        fontSize, fontWeight: 600,
        background: visual.bg,
        color: visual.color,
        border: `1px solid ${visual.border}`,
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
        lineHeight: 1.2,
      }}
    >
      {providerIcon && <Icon icon={providerIcon} width={iconSize} />}
      <Icon icon={visual.icon} width={iconSize} />
      <span>{label}</span>
    </Tag>
  )
}
