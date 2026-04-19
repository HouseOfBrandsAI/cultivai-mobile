import { useEffect } from 'react'
import useAppStatusStore from '../stores/useAppStatusStore'

export default function useOnlineStatus() {
  const online = useAppStatusStore((s) => s.online)
  const setOnline = useAppStatusStore((s) => s.setOnline)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  return online
}
