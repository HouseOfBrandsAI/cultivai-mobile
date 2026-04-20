# Ops Alignment Contract

The mobile Employee app and the desktop Operations Manager (in `grow1976/`) must display
the same data with the same visual language. This doc locks that contract.

**Source of truth on this side:** `src/constants/ops.js`
**Source of truth on desktop:** `grow1976/docs/Prototypes/CultivAI_Operations_Manager.html`

When the desktop prototype changes (new room, new category, re-coloring), `ops.js`
must be updated in lockstep before the mobile UI ships.

---

## Rooms

| ID | Name | Color | Stage |
|----|------|-------|-------|
| `mom` | Mother Room | `#a78bfa` (purple) | mother |
| `clone` | Clone Room | `#38bdf8` (sky) | clone |
| `veg1` | Veg 1 | `#22c55e` (green) | veg |
| `veg2` | Veg 2 | `#16a34a` (dark green) | veg |
| `flower-a` | Flower A | `#f59e0b` (amber) | flower |
| `flower-b` | Flower B | `#fb923c` (orange) | flower |
| `dry` | Dry Room | `#a3e635` (lime) | dry |
| `trim` | Trim Room | `#ec4899` (pink) | trim |

Use `roomChipStyle(id)` for shift/assignment chips (includes the 3px left-border),
`roomDotStyle(id)` for inline dots, and `getRoom(id)` for name lookups (tolerant of
"Flower A" / "flower-a" / "Flower%20A" variants).

## Task categories (6)

| ID | Icon | Label | Color |
|----|------|-------|-------|
| `cultivation` | 🌱 | Cultivation | `#22c55e` (green) |
| `maintenance` | 🔧 | Maintenance & BMS | `#38bdf8` (sky) |
| `purchasing` | 🛒 | Purchasing | `#f59e0b` (amber) |
| `compliance` | ⚖️ | Compliance | `#a78bfa` (purple) |
| `onboarding` | 📋 | Onboarding | `#fb923c` (orange) |
| `admin` | 📁 | Administrative | `#94a3b8` (muted) |

Use `categoryBadgeStyle(id)` for pill badges, `getCategory(id)` for label + icon lookups.

## Task statuses

| ID | Label | Color |
|----|-------|-------|
| `backlog` | Backlog | `#94a3b8` (muted) |
| `todo` | To Do | `#94a3b8` (muted) |
| `in-progress` | In Progress | `#38bdf8` (sky) |
| `review` | Review | `#a78bfa` (purple) |
| `done` | Done | `#22c55e` (green) |

Backend strings are normalized: `pending → todo`, `in_progress → in-progress`,
`completed|complete → done`, `in-review|reviewing → review`. Use `normalizeStatus(raw)`
at any boundary that touches server data.

## Priorities

| ID | Color | Notes |
|----|-------|-------|
| `low` | `#94a3b8` (muted) | — |
| `medium` | `#38bdf8` (sky) | — |
| `high` | `#f59e0b` (amber) | — |
| `urgent` | `#ef4444` (red) | red glow (`box-shadow: 0 0 6px`) |

Use `priorityDotStyle(id)` for the 8px dot — this is the one place where `urgent`
gets its glow.

## Employee shift status

| ID | Label | Color |
|----|-------|-------|
| `on` | On Shift | `#22c55e` (green) |
| `off` | Off | `#94a3b8` (muted) |
| `pto` | PTO | `#f59e0b` (amber) |

---

## Boundary rules (employee vs. manager)

| Capability | Mobile (this app) |
|-----------|-------------------|
| View schedule | Own shifts only |
| Create/edit shifts | ❌ — request time off only |
| View tasks | Own assignments only |
| Create tasks | ❌ |
| Update own task status | ✅ |
| View team | Directory + announcements (read-only) |
| Manage team | ❌ |
| Create announcements | ❌ |

If a change reaches for a capability above the line, it belongs in the desktop
Operations Manager, not here.
