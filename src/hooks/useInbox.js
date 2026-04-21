import { useEffect, useRef } from 'react'
import { broadcastApi } from '../api/endpoints'
import useInboxStore from '../stores/useInboxStore'
import useAuthStore from '../stores/useAuthStore'

const FOREGROUND_INTERVAL_MS = 3_000
const BACKGROUND_PAUSE = true // stop polling when tab hidden

/**
 * Polls /api/mobile/inbox while the tab is foregrounded (Page Visibility API).
 * Returns the list of entries that arrived since the previous poll so callers
 * can fire transient UI (toast / banner) without reducing again.
 */
export default function useInbox(onNewEntries) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setEntries = useInboxStore((s) => s.setEntries)
  const onNewRef = useRef(onNewEntries)
  onNewRef.current = onNewEntries

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false
    let timer = null

    const poll = async () => {
      try {
        const data = await broadcastApi.inbox()
        if (cancelled) return
        const fresh = setEntries(data)
        if (fresh.length > 0) onNewRef.current?.(fresh)
      } catch {
        // silent — prototype backend may be stubbed
      }
    }

    const start = () => {
      if (timer) return
      poll()
      timer = setInterval(poll, FOREGROUND_INTERVAL_MS)
    }

    const stop = () => {
      if (!timer) return
      clearInterval(timer)
      timer = null
    }

    const onVisibility = () => {
      if (!BACKGROUND_PAUSE) return
      if (document.hidden) stop()
      else start()
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, setEntries])
}
