import { create } from 'zustand'

const useAppStatusStore = create((set) => ({
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSubmissions: [],

  setOnline: (online) => set({ online }),

  queueSubmission: (submission) =>
    set((state) => ({
      pendingSubmissions: [...state.pendingSubmissions, { ...submission, queued_at: new Date().toISOString() }],
    })),

  clearQueue: () => set({ pendingSubmissions: [] }),

  removeSubmission: (id) =>
    set((state) => ({
      pendingSubmissions: state.pendingSubmissions.filter((s) => s.id !== id),
    })),
}))

export default useAppStatusStore
