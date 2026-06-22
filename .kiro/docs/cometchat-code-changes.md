# CometChat Integration — Code Changes Tracker

This document tracks all code changes made during CometChat integration into the Medicare project.

---

## Integration Status

| Platform | Status | Last Updated |
|---|---|---|
| Web (`/frontend`) | Voice/Video Calls Working (Full-screen) | 2026-06-22 |
| Mobile (`/mobile`) | Chat only — Calls removed | 2026-06-22 |
| Backend (`/backend`) | Telehealth Gating & REST Msg Sending Complete | 2026-06-19 |

## Branch
- Work branch: `cometchat-integration` (from `production-ready-app`)
- `production-ready-app` must remain frozen (no commits after Step 1 approval)

---

## Credentials

**Note:** Per SOW Step 2, client SDK is initialized with auth token from `/api/cometchat/sync` — NEVER with raw API keys on the client.

| Field | Env Var (Backend `.env`) | Purpose |
|---|---|---|
| App ID | `COMETCHAT_APP_ID` | Backend sync + webhook config |
| Region | `COMETCHAT_REGION` | Backend sync |
| Auth Key | `COMETCHAT_AUTH_KEY` | Backend only — mint tokens for users |
| REST API Key | `COMETCHAT_REST_API_KEY` | Backend only — user CRUD, group management |
| Webhook Secret | `COMETCHAT_WEBHOOK_SECRET` | Backend only — HMAC validation |

**Client never sees credentials directly.** The flow is:
1. User logs in → app calls `POST /api/cometchat/sync`
2. Backend creates/updates CometChat user + mints auth token
3. Client receives token → calls `CometChatUIKit.loginWithAuthToken(token)`

---

## Change Log

### 2026-06-18 — Backend: User Model + New Database Models
- **Platform:** Backend
- **Skill(s) used:** cometchat-core, cometchat-production
- **Files changed:**
  - `backend/models/User.js` — Added `cometChatUid` field (STRING, nullable, unique)
  - `backend/models/WebhookLog.js` — New model: eventId, source, eventType, payload, status, receivedAt
  - `backend/models/CallLog.js` — New model: sessionId, initiatorUid, receiverUid, callType, status, startedAt, endedAt, durationSeconds, initiatedAt
  - `backend/models/AgentMetrics.js` — New model: agentUid, date, conversationsHandled, totalMessages, avgResponseTimeMs, firstMessageAt, lastMessageAt
  - `backend/models/DoctorSession.js` — New model: doctorUid, onlineAt, offlineAt, durationMinutes
  - `backend/models/index.js` — Registered all 4 new models + exports
- **Packages added:** None
- **Notes:** Uses Sequelize sync({ alter: true }) in dev to auto-create columns/tables

---

### 2026-06-18 — Backend: CometChat Service Layer
- **Platform:** Backend
- **Skill(s) used:** cometchat-production, cometchat-core
- **Files changed:**
  - `backend/services/cometchatService.js` — New file: deriveCometChatUid(), createCometChatUser(), updateCometChatUser(), deactivateCometChatUser(), generateAuthToken(), buildUserTags(), syncUserToCometChat(), ensureRoleExists(), initializeCometChatRoles()
- **Packages added:** None
- **Notes:** Uses REST API Key for all server calls. Handles 429 rate limiting with retry. 409 conflicts resolved by updating. UID strategy: `medicare_user_{USER.id}`

---

### 2026-06-18 — Backend: CometChat Sync & Contacts Routes
- **Platform:** Backend
- **Skill(s) used:** cometchat-core, cometchat-production
- **Files changed:**
  - `backend/routes/cometchatRoutes.js` — New file: POST /api/cometchat/sync, GET /api/cometchat/contacts, GET /api/cometchat/config
- **Packages added:** None
- **Notes:** /sync creates/updates CometChat user + returns auth token. /contacts is role-filtered (patients see doctors, doctors see patients+peers, staff see nothing, admins see all). /config returns appId+region (no secrets).

---

### 2026-06-18 — Backend: Webhook Endpoint
- **Platform:** Backend
- **Skill(s) used:** cometchat-production (webhook patterns)
- **Files changed:**
  - `backend/routes/webhookRoutes.js` — New file: POST /api/webhooks/cometchat with HMAC validation + event routing
- **Packages added:** None (crypto is built-in)
- **Notes:** Handles 11 event types (message_sent, message_flagged, message_blocked, call_initiated/accepted/rejected/unanswered/ended, user_blocked, user_online/offline). Implements all 8 webhook use cases (W1-W8). Idempotency via eventId dedup.

---

### 2026-06-18 — Backend: Auth & Admin Integration Hooks
- **Platform:** Backend
- **Skill(s) used:** cometchat-production
- **Files changed:**
  - `backend/controllers/authController.js` — Added CometChat user creation in register() flow (non-blocking)
  - `backend/controllers/adminController.js` — Added CometChat create in adminCreateUser(), update sync in adminUpdateUser(), deactivate in adminDeactivateUser()
- **Packages added:** None
- **Notes:** All CometChat calls are wrapped in try/catch so they don't fail the primary operation if CometChat is unavailable.

---

### 2026-06-18 — Backend: Admin CometChat Endpoints
- **Platform:** Backend
- **Skill(s) used:** cometchat-production
- **Files changed:**
  - `backend/routes/adminCometChatRoutes.js` — New file: GET /api/admin/webhooks, /call-logs, /agent-metrics, /doctor-sessions, /moderation-queue, /cometchat-summary
- **Packages added:** None
- **Notes:** All require ADMIN role. Summary endpoint provides real-time counters (messages today, active calls, doctors online, flagged pending).

---

### 2026-06-18 — Backend: Route Registration + Startup Init
- **Platform:** Backend
- **Skill(s) used:** cometchat-core
- **Files changed:**
  - `backend/server.js` — Imported + registered cometchatRoutes, webhookRoutes, adminCometChatRoutes. Added initializeCometChatRoles() on startup.
  - `.env.example` — Added COMETCHAT_WEBHOOK_SECRET
- **Packages added:** None
- **Notes:** Roles (patient, doctor, staff, admin) are ensured in CometChat on every server start.

---

### 2026-06-18 — Frontend: CometChat SDK Install + Provider
- **Platform:** Web (`/frontend`)
- **Skill(s) used:** cometchat-core, cometchat-react-calls
- **Files changed:**
  - `frontend/package.json` — Added @cometchat/chat-sdk-javascript, @cometchat/chat-uikit-react, @cometchat/calls-sdk-javascript@5
  - `frontend/src/cometchat/errors.js` — New: formatCometChatError(), logCometChatError()
  - `frontend/src/cometchat/CometChatProvider.jsx` — New: context provider with full init lifecycle (config fetch → UIKit init → Calls init → sync → loginWithAuthToken)
  - `frontend/src/main.jsx` — Added CSS import: @cometchat/chat-uikit-react/css-variables.css
  - `frontend/src/App.jsx` — Added CometChatWrapper component wrapping AppContent
- **Packages added:** @cometchat/chat-sdk-javascript, @cometchat/chat-uikit-react, @cometchat/calls-sdk-javascript@5
- **Notes:** Provider handles StrictMode double-mount, Staff role skip, non-fatal errors (children always render). CSS imported once at root per cometchat-core rules.

---

### 2026-06-18 — Mobile: CometChat SDK Install + Provider
- **Platform:** Mobile (`/mobile`)
- **Skill(s) used:** cometchat-native-core, cometchat-native-expo-patterns
- **Files changed:**
  - `mobile/package.json` — Added @cometchat/chat-sdk-react-native, @cometchat/chat-uikit-react-native, @cometchat/calls-sdk-react-native
  - `mobile/src/context/CometChatContext.js` — New: CometChatProvider + logoutCometChat export
  - `mobile/App.js` — Wrapped NavigationWrapper with CometChatProvider
  - `mobile/src/context/AuthContext.js` — Added logoutCometChat() call in logout flow
- **Packages added:** @cometchat/chat-sdk-react-native, @cometchat/chat-uikit-react-native, @cometchat/calls-sdk-react-native
- **Notes:** Same auth pattern as web — fetches config from backend, syncs via /api/cometchat/sync, logs in with server-minted token. CometChat logout integrated into app logout flow.

---

### 2026-06-18 — Frontend: Chat UI Rebuilt with CometChat Components
- **Platform:** Web (`/frontend`)
- **Skill(s) used:** cometchat-components, cometchat-placement, cometchat-react-calls
- **Files changed:**
  - `frontend/src/pages/Chats.jsx` — Complete rewrite: replaced ~500-line custom Socket.io chat with CometChat UI Kit components
- **Packages added:** None (already installed)
- **Notes:** 
  - **Left pane:** `CometChatConversations` (real-time list with presence, typing, unread counts built-in) + custom "New Chat" panel that fetches appointment-based contacts from `GET /api/cometchat/contacts`
  - **Right pane:** `CometChatMessageHeader` + `CometChatMessageList` + `CometChatMessageComposer` (real-time messages, typing indicators, read receipts, file attachments all built-in)
  - **Role-based calls:** `hideVideoCall: true, hideVoiceCall: true` passed to MessageHeader for non-doctor users — doctors see both call buttons by default
  - **Staff blocked:** Shows "Chat Unavailable" for staff role
  - **Loading state:** Shows spinner while CometChat SDK initializes
  - **Preserved:** Dual-pane fixed layout (340px sidebar), appointment-based contacts panel, responsive mobile-first back button
  - **Removed:** All manual Socket.io event handling (message:received, typing:start/stop, user:online, messages:read), custom message state management, typing timeouts, online status polling — all now handled internally by CometChat SDK

---

### 2026-06-19 — Web & Mobile: Group Chats & Telehealth Gating Fixes
- **Platform:** Backend, Web (`/frontend`), Mobile (`/mobile`)
- **Skill(s) used:** cometchat-components, cometchat-placement, cometchat-react-calls, cometchat-native-core
- **Files created/modified:**
  - `backend/services/cometchatService.js` [MODIFY] — Safely handled `ERR_UID_ALREADY_EXISTS` on user create/sync to update instead of fail.
  - `backend/controllers/appointmentController.js` [MODIFY] — Triggered initial greet message on `acceptChat` and final notification message on `cancelAppointment` via CometChat REST API.
  - `backend/routes/cometchatRoutes.js` [MODIFY] — Gated the available contacts endpoint to return users only if they have an active, accepted telehealth session.
  - `frontend/src/pages/Chats.jsx` [MODIFY] — Rebuilt selection flow to support group chat, added doctor group creation modal, restricted group add/manage/delete modals to the group owner, and fixed header call button hiding flags (`hideVideoCallButton` and `hideVoiceCallButton`).
  - `mobile/src/screens/ChatsListScreen.js` [MODIFY] — Added group item press navigation and a group creation form modal for doctor users.
  - `mobile/src/screens/ChatSimulationScreen.js` [MODIFY] — Integrated group conversation loading, updated navigation headers to dynamically display owner-restricted management icons, and hid call buttons for patients.
- **Notes:** Resolves all caching session switch issues, locks messaging composers for pending/closed appointments, and provides secure, doctor-led group chats.

---

### 2026-06-22 — Web: Voice/Video Calls Full-Screen Implementation
- **Platform:** Web (`/frontend`)
- **Skill(s) used:** cometchat-react-calls, cometchat-calls
- **Files changed:**
  - `frontend/src/cometchat/CometChatProvider.jsx` [MODIFY] — Added `CometChatIncomingCall` import + global overlay rendering. Added `OngoingCallElevator` component (MutationObserver + DOM reparenting for full-screen call UI).
  - `frontend/src/index.css` [MODIFY] — Added CSS override for `.cometchat-call-elevator .cometchat-ongoing-call` to fill viewport.
- **Packages added:** None (Calls SDK already installed)
- **Notes:**
  - **Incoming calls** (patient side): `<CometChatIncomingCall />` mounted at app root in a fixed overlay (`z-index: 99999`, `pointer-events: none` on container, `auto` on children). Renders accept/decline on any page.
  - **Ongoing calls** (doctor side): `OngoingCallElevator` uses a `MutationObserver` to detect `.cometchat-ongoing-call` in DOM, physically moves the element to a new `<div>` at `document.body` level with `z-index: 2147483647`. Bypasses all parent stacking contexts. A 500ms polling interval detects call end (iframe removed) and hides the overlay.
  - **Key insight:** CSS `position: fixed` alone cannot break out of a parent stacking context. The Chats page container (`position: fixed; z-index: 50`) creates a ceiling. DOM reparenting is the only reliable solution.

---

### 2026-06-22 — Mobile: Calls Feature Completely Removed
- **Platform:** Mobile (`/mobile`)
- **Skill(s) used:** N/A (removal)
- **Files changed:**
  - `mobile/src/components/CallSurfaces.js` [DELETED]
  - `mobile/package.json` [MODIFY] — Removed `@cometchat/calls-sdk-react-native`, `lib-jitsi-meet`, `react-native-webrtc`, `react-native-video`, `react-native-background-timer`, `@xmldom/xmldom`, `abab`
  - `mobile/metro.config.js` [MODIFY] — Stripped all Calls SDK resolution workarounds, now basic `getDefaultConfig(__dirname)`
  - `mobile/src/context/CometChatContext.js` [MODIFY] — Removed `CometChatCalls` import, init, and login code
  - `mobile/src/screens/ChatSimulationScreen.js` [MODIFY] — Removed `hideVideoCallButton`/`hideVoiceCallButton` props from `CometChatMessageHeader`
  - `mobile/App.js` [MODIFY] — Removed `CallSurfaces` import and `<CallSurfaces />` usage
- **Packages removed:** `@cometchat/calls-sdk-react-native`, `lib-jitsi-meet`, `react-native-webrtc`, `react-native-video`, `react-native-background-timer`, `@xmldom/xmldom`, `abab`
- **Notes:** Mobile calling was unstable due to Metro resolution issues, polyfill crashes, and Expo managed workflow limitations. Web-only calling is the current approach.

---

## Architecture Decisions

| Decision | Choice | Rationale | Date |
|---|---|---|---|
| Chat placement (web) | Route at `/chat` — dual-pane | SOW Step 2 specifies full-page chat route with left (contacts) + right (messages) panes | 2026-06-18 |
| Calling mode | Ringing (doctor-initiated, 1:1) | Doctors call patients directly; patients cannot initiate — SOW requirement | 2026-06-18 |
| Auth mode | Server-minted tokens via `/api/cometchat/sync` | Healthcare data — no client-side auth keys; token-only from day one | 2026-06-18 |
| UID strategy | `medicare_user_{USER.id}` | Deterministic, no collisions, easy to debug — SOW §3.2 | 2026-06-18 |
| Notification separation | Both pipelines write to same `NOTIFICATION_LOG` with `type` column | Unified admin audit trail; minimal schema change — SOW §7.3 | 2026-06-18 |
| Agent routing | Query `role:agent` + `status:online` | SOW §8.3 flow | 2026-06-18 |
| Webhook validation | HMAC signature on every payload | Security requirement — SOW §10.3 | 2026-06-18 |
| Staff messaging | Presence only, no messaging | SOW §4.1 role mapping | 2026-06-18 |
| CometChat calls non-blocking | All CometChat REST calls in try/catch | Don't fail primary operations if CometChat is down | 2026-06-18 |
| Calls SDK version | Pinned to @5 | Per cometchat-react-calls skill — `latest` tag still points to v4 | 2026-06-18 |
| Web call UI elevation | DOM reparenting via MutationObserver | CSS position:fixed cannot escape parent stacking contexts; only reparenting to document.body works | 2026-06-22 |
| Mobile calling | Removed entirely (web-only) | Unstable in Expo managed workflow — Metro resolution, polyfill, and WebRTC native module issues | 2026-06-22 |

---

## Known Issues / Blockers

| Issue | Status | Resolution |
|---|---|---|
| COMETCHAT_WEBHOOK_SECRET not yet set in .env | Pending | Will configure after CometChat dashboard webhook setup |
| Frontend chat UI components not yet built | Done | Rebuilt Chats.jsx with CometChat UI Kit components (2026-06-18) |
| Mobile chat screen uses old Socket.io chat | Pending | Will migrate to CometChat UI Kit components |
| Web voice/video calls | Done | Full-screen calls working for both doctor (initiator) and patient (receiver) (2026-06-22) |
| Mobile voice/video calls | Removed | Packages uninstalled, code stripped (2026-06-22) |

---

## Files Created for CometChat

### Web (`/frontend`)
- `src/cometchat/errors.js` — Error formatting utilities
- `src/cometchat/CometChatProvider.jsx` — React context provider for CometChat lifecycle

### Mobile (`/mobile`)
- `src/context/CometChatContext.js` — RN context provider for CometChat lifecycle

### Backend (`/backend`)
- `services/cometchatService.js` — CometChat REST API service layer
- `routes/cometchatRoutes.js` — Sync + contacts + config endpoints
- `routes/webhookRoutes.js` — Webhook receiver with event routing
- `routes/adminCometChatRoutes.js` — Admin analytics/monitoring endpoints
- `models/WebhookLog.js` — Webhook event audit log
- `models/CallLog.js` — Voice/video call tracking
- `models/AgentMetrics.js` — Support agent performance data
- `models/DoctorSession.js` — Doctor online/offline session tracking

---

## Files Modified for CometChat

### Backend
- `models/User.js` — Added `cometChatUid` field
- `models/index.js` — Registered new models
- `controllers/authController.js` — CometChat user creation on register
- `controllers/adminController.js` — CometChat create/update/deactivate hooks
- `server.js` — Route registration + role initialization

### Frontend
- `package.json` — Added 3 CometChat packages
- `src/main.jsx` — CSS import
- `src/App.jsx` — CometChatWrapper + provider integration
- `src/pages/Chats.jsx` — Rebuilt with CometChat UI Kit (CometChatConversations, MessageHeader, MessageList, MessageComposer)

### Mobile
- `package.json` — Added 3 CometChat packages
- `App.js` — CometChatProvider wrapping
- `src/context/AuthContext.js` — Logout integration

### Config
- `.env.example` — Added COMETCHAT_WEBHOOK_SECRET

---

*Last updated: 2026-06-22*
