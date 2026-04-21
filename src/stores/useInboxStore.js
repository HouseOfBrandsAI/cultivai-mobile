import { create } from 'zustand'

/**
 * Inbox store — single source of truth for broadcast / nudge / live-preview
 * entries received from the backend.
 *
 * Entry shape (uniform across all kinds — see OPS_ALIGNMENT for the contract):
 *   {
 *     id: string,
 *     kind: "broadcast" | "nudge" | "dm" | "live_preview",
 *     title: string,
 *     body: string,
 *     urgent: boolean,
 *     from: { id, name } | null,
 *     created_at: ISO 8601,
 *     read: boolean,
 *   }
 *
 * Which UI consumes what:
 *   - broadcast / dm  → Inbox page + optional system notification
 *   - nudge           → toast in AppShell (NudgeToast), NOT a system notification
 *   - live_preview    → passive banner in AppShell (LivePreviewBanner)
 */

const useInboxStore = create((set, get) => ({
  entries: [],
  lastPolledAt: null,

  /** Replace the full entries list (called by useInbox poller). */
  setEntries: (next) => {
    const prev = get().entries
    const prevIds = new Set(prev.map((e) => e.id))
    const arr = Array.isArray(next) ? next : []
    // Detect new-since-last-poll for transient UI (toast / banner).
    const fresh = arr.filter((e) => !prevIds.has(e.id))
    set({ entries: arr, lastPolledAt: Date.now() })
    return fresh
  },

  /** Mark one entry read locally (optimistic — caller patches backend). */
  markReadLocal: (id) =>
    set((s) => ({
      entries: s.entries.map((e) => e.id === id ? { ...e, read: true } : e),
    })),

  /** Selectors. */
  unreadCount: () => get().entries.filter((e) => !e.read).length,
  unreadByKind: (kind) => get().entries.filter((e) => !e.read && e.kind === kind).length,
  latestByKind: (kind, n = 3) =>
    get().entries.filter((e) => e.kind === kind).slice(0, n),
}))

export default useInboxStore
