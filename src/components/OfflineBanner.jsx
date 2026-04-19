import { useTranslation } from 'react-i18next'
import { Icon } from '@iconify/react'
import useOnlineStatus from '../hooks/useOnlineStatus'

export default function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      role="status"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(251, 191, 36, 0.15)',
        borderBottom: '1px solid rgba(251, 191, 36, 0.35)',
        color: 'var(--status-warning)',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      <Icon icon="mdi:wifi-off" width={16} />
      <span>{t('app.offlineBanner')}</span>
    </div>
  )
}
