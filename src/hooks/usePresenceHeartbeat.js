import { useEffect } from 'react'
import { presenceApi } from '../api/endpoints'
import useAuthStore from '../stores/useAuthStore'

const FOREGROUND_INTERVAL_MS = 60_000
const BACKGROUND_INTERVAL_MS = 5 * 60_000

function getDeviceId() {
  let id = localStorage.getItem('cultivai_device_id')
  if (!id) {
    id = `dev-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('cultivai_device_id', id)
  }
  return id
}

function getNetwork() {
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  return c?.effectiveType || null
}

/**
 * Sends presence heartbeats while the user is authenticated.
 * Foregrounded: 60s. Backgrounded: 5min. Silent on failure.
 */
export default function usePresenceHeartbeat() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    const deviceId = getDeviceId()
    let timer = null

    const send = () => {
      presenceApi.heartbeat({ device_id: deviceId, network: getNetwork() }).catch(() => {})
    }

    const schedule = () => {
      if (timer) clearInterval(timer)
      const interval = document.hidden ? BACKGROUND_INTERVAL_MS : FOREGROUND_INTERVAL_MS
      timer = setInterval(send, interval)
    }

    send()
    schedule()
    const onVisibility = () => { send(); schedule() }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (timer) clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated])
}
