import { useEffect, useRef } from 'react'
import useAuthStore from '../stores/useAuthStore'

export default function useWebSocket(facilityId, onMessage) {
  const token = useAuthStore((s) => s.token)
  const wsRef = useRef(null)

  useEffect(() => {
    if (!facilityId || !token) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/${facilityId}?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage?.(data)
      } catch {
        // ignore malformed
      }
    }

    return () => ws.close()
  }, [facilityId, token, onMessage])

  return wsRef
}
