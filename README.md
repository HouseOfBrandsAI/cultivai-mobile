# CultivAI Mobile — Employee App

Tablet-optimized PWA for CultivAI grow facility employees. One app per shared tablet (wall-mounted in each grow room) + individual devices.

## Stack

- **React 19** + **Vite 6** + **Tailwind v4**
- **react-router-dom 7** for routing
- **Zustand** for state
- **i18next** for EN / ES / FR / PT
- **@iconify/react** for icons
- **PWA** — manifest + service worker with offline form-queue

## Development

```bash
npm install
npm run dev         # http://localhost:5174 (proxies /api → :8000)
```

Backend: shared FastAPI server in `grow1976/backend/` — not duplicated here.

## Build

```bash
npm run build       # outputs to dist/
npm run preview     # serve dist/ locally
```

## Structure

```
src/
├── api/            axios client (same pattern as Desktop)
├── stores/         zustand stores (auth, app status)
├── pages/          route components
│   ├── admin/      manager/admin-only pages
├── components/     AppShell, BottomNav, OfflineBanner, etc.
├── hooks/          useOnlineStatus, useWebSocket
├── i18n/           locale JSON files
├── theme/          employee dark-green CSS tokens (always active)
├── utils/          formatDate, etc.
├── App.jsx         route tree
└── main.jsx        entry + service worker registration
```

## Routes

**Employee:** `/` Home, `/chat`, `/tasks`, `/docs`, `/forms`, `/schedule`, `/team`, `/assistant`

**Admin (manager/admin role):** `/admin/documents`, `/admin/schedule`, `/admin/team`

## Theme

Employee dark-green theme is **always active** — no theme switcher. Tokens live in `src/theme/employee.css`.

## Backend endpoints used

- `/api/v1/auth/*`
- `/api/v1/chat/*`
- `/api/v1/documents/*`, `/api/v1/employee-documents/*`
- `/api/v1/schedule/*`
- `/api/v1/team/*`
- `/api/v1/forms/*`
- `/api/v1/onboarding/*`
- `/api/v1/tasks/*`
- `/api/v1/assistant/ask`

## Deployment

PWA built from Vite → static host (Netlify / Vercel / nginx). Install to home screen on tablets for full-screen use.
