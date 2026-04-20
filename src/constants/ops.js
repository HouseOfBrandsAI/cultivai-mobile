// Shared operations constants — MUST match desktop Operations Manager prototype
// Source of truth: grow1976/docs/Prototypes/CultivAI_Operations_Manager.html
//
// When the desktop prototype changes, update this file in lockstep.

/* ────────────────────────── ROOMS ────────────────────────── */

export const ROOMS = [
  { id: 'mom',      name: 'Mother Room', color: '#a78bfa', rgb: '167,139,250', stage: 'mother' },
  { id: 'clone',    name: 'Clone Room',  color: '#38bdf8', rgb: '56,189,248',  stage: 'clone' },
  { id: 'veg1',     name: 'Veg 1',       color: '#22c55e', rgb: '34,197,94',   stage: 'veg' },
  { id: 'veg2',     name: 'Veg 2',       color: '#16a34a', rgb: '22,163,74',   stage: 'veg' },
  { id: 'flower-a', name: 'Flower A',    color: '#f59e0b', rgb: '245,158,11',  stage: 'flower' },
  { id: 'flower-b', name: 'Flower B',    color: '#fb923c', rgb: '251,146,60',  stage: 'flower' },
  { id: 'dry',      name: 'Dry Room',    color: '#a3e635', rgb: '163,230,53',  stage: 'dry' },
  { id: 'trim',     name: 'Trim Room',   color: '#ec4899', rgb: '236,72,153',  stage: 'trim' },
]

const ROOMS_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]))

export function getRoom(id) {
  if (!id) return null
  const direct = ROOMS_BY_ID[id]
  if (direct) return direct
  // Tolerant lookup: match by name substring (e.g., "Flower A" → flower-a)
  const key = String(id).toLowerCase().replace(/\s+/g, '-')
  return ROOMS_BY_ID[key] || null
}

/** CSS for a room chip — same visual language as desktop .shift-chip */
export function roomChipStyle(id) {
  const room = getRoom(id)
  if (!room) {
    return {
      background: 'rgba(100,116,139,0.14)',
      borderLeft: '3px solid #64748b',
      color: '#cbd5e1',
    }
  }
  return {
    background: `rgba(${room.rgb}, 0.14)`,
    borderLeft: `3px solid ${room.color}`,
    color: room.color,
  }
}

export function roomDotStyle(id) {
  const room = getRoom(id)
  return {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: room?.color || '#64748b',
    flexShrink: 0,
  }
}

/* ─────────────────────── TASK CATEGORIES (6) ─────────────────────── */

export const CATEGORY_META = {
  cultivation: { icon: '🌱', label: 'Cultivation',       color: '#22c55e', rgb: '34,197,94' },
  maintenance: { icon: '🔧', label: 'Maintenance & BMS', color: '#38bdf8', rgb: '56,189,248' },
  purchasing:  { icon: '🛒', label: 'Purchasing',        color: '#f59e0b', rgb: '245,158,11' },
  compliance:  { icon: '⚖️', label: 'Compliance',        color: '#a78bfa', rgb: '167,139,250' },
  onboarding:  { icon: '📋', label: 'Onboarding',        color: '#fb923c', rgb: '251,146,60' },
  admin:       { icon: '📁', label: 'Administrative',    color: '#94a3b8', rgb: '148,163,184' },
}

export const CATEGORIES = Object.entries(CATEGORY_META).map(([id, meta]) => ({ id, ...meta }))

export function getCategory(id) {
  return CATEGORY_META[id] || { icon: '📌', label: id || 'Other', color: '#94a3b8', rgb: '148,163,184' }
}

export function categoryBadgeStyle(id) {
  const c = getCategory(id)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: `rgba(${c.rgb}, 0.14)`,
    color: c.color,
  }
}

/* ─────────────────────── TASK STATUSES ─────────────────────── */

export const STATUSES = [
  { id: 'backlog',     label: 'Backlog',     color: '#94a3b8', rgb: '148,163,184' },
  { id: 'todo',        label: 'To Do',       color: '#94a3b8', rgb: '148,163,184' },
  { id: 'in-progress', label: 'In Progress', color: '#38bdf8', rgb: '56,189,248' },
  { id: 'review',      label: 'Review',      color: '#a78bfa', rgb: '167,139,250' },
  { id: 'done',        label: 'Done',        color: '#22c55e', rgb: '34,197,94' },
]

const STATUSES_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]))

/** Normalize backend status strings (e.g., "in_progress", "pending") to our ids. */
export function normalizeStatus(raw) {
  if (!raw) return 'todo'
  const s = String(raw).toLowerCase().replace(/_/g, '-')
  if (STATUSES_BY_ID[s]) return s
  if (s === 'pending') return 'todo'
  if (s === 'completed' || s === 'complete') return 'done'
  if (s === 'in-review' || s === 'reviewing') return 'review'
  return s
}

export function getStatus(id) {
  return STATUSES_BY_ID[normalizeStatus(id)] || STATUSES_BY_ID.todo
}

export function statusBadgeStyle(id) {
  const s = getStatus(id)
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: `rgba(${s.rgb}, 0.14)`,
    color: s.color,
  }
}

/* ─────────────────────── PRIORITIES ─────────────────────── */

export const PRIORITIES = [
  { id: 'low',    label: 'Low',    color: '#94a3b8', glow: false },
  { id: 'medium', label: 'Medium', color: '#38bdf8', glow: false },
  { id: 'high',   label: 'High',   color: '#f59e0b', glow: false },
  { id: 'urgent', label: 'Urgent', color: '#ef4444', glow: true },
]

const PRIORITIES_BY_ID = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]))

export function getPriority(id) {
  return PRIORITIES_BY_ID[id] || PRIORITIES_BY_ID.medium
}

export function priorityDotStyle(id) {
  const p = getPriority(id)
  return {
    display: 'inline-block',
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: p.color,
    boxShadow: p.glow ? `0 0 6px ${p.color}` : 'none',
    flexShrink: 0,
  }
}

/* ─────────────────────── EMPLOYEE SHIFT STATUS ─────────────────────── */

export const EMP_STATUS_META = {
  on:  { label: 'On Shift', color: '#22c55e', rgb: '34,197,94' },
  off: { label: 'Off',      color: '#94a3b8', rgb: '148,163,184' },
  pto: { label: 'PTO',      color: '#f59e0b', rgb: '245,158,11' },
}

export function empStatusBadgeStyle(id) {
  const s = EMP_STATUS_META[id] || EMP_STATUS_META.off
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: `rgba(${s.rgb}, 0.14)`,
    color: s.color,
  }
}

/* ─────────────────────── DEPARTMENTS ─────────────────────── */

export const DEPARTMENTS = ['Cultivation', 'Processing', 'Admin']
