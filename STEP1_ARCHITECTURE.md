# STEP 1 — Production-Ready App Architecture

**Branch:** `production-ready-app`  
**Status:** Complete & Frozen (pre-CometChat baseline)

This document describes all logic, patterns, and systems implemented in Step 1. This is the foundation that Step 2 (CometChat integration) builds upon without modifying.

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Backend | Node.js + Express | 20.x |
| Database | PostgreSQL + Sequelize ORM | 16 / 6.x |
| Frontend (Web) | React + Vite | 18.3 / 5.3 |
| Mobile | Expo + React Native | SDK 54 / RN 0.81 |
| Real-time | Socket.io | 4.x |
| Push (Web) | web-push (VAPID) | — |
| Push (Mobile) | Firebase Admin SDK (FCM) | — |
| Containerization | Docker + Docker Compose | — |
| Auth | JWT (jsonwebtoken) | — |

---

## 2. Backend Architecture

### 2.1 Server Setup (`backend/server.js`)

- Express app + HTTP server on port 5000
- Socket.io attached to the HTTP server
- CORS configured (production: `CORS_ORIGIN` env, dev: `*`)
- Body parser: JSON (10mb limit) + URL-encoded
- Static file serving: `/uploads` for user uploads, `/public` for built frontend
- SPA fallback: all non-API routes serve `index.html` for client-side routing
- Error handler middleware at the end of the chain
- Database sync: `alter: true` in dev, plain `sync()` in production

### 2.2 Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Patient self-registration |
| POST | `/api/auth/login` | Public | User login (PATIENT, DOCTOR, STAFF) |
| POST | `/api/auth/admin/login` | Public | Admin-only login |
| POST | `/api/auth/logout` | JWT | Logout + activity log |
| GET | `/api/profile` | JWT | Get current user profile |
| PUT | `/api/profile` | JWT | Update profile |
| GET | `/api/doctors` | Public | List all doctors |
| GET | `/api/doctors/:id` | Public | Get doctor details |
| GET/POST | `/api/appointments` | JWT | List / book appointments |
| PUT | `/api/appointments/:id` | JWT | Update appointment status |
| GET/POST/DELETE | `/api/records` | JWT | Health records CRUD |
| GET | `/api/articles` | Public | List published articles |
| GET | `/api/articles/:id` | Public | Get article detail |
| POST | `/api/ai/chat` | JWT | AI assistant chat |
| GET | `/api/notifications/my` | JWT | User's notifications |
| POST | `/api/notifications/subscribe` | JWT | Register web push |
| POST | `/api/notifications/expo-token` | JWT | Register mobile push token |
| GET | `/api/chat/conversations` | JWT | Message-based conversations |
| GET | `/api/chat/contacts` | JWT | Appointment-based contacts |
| GET | `/api/chat/messages/:contactId` | JWT | Message history |
| POST | `/api/chat/messages` | JWT | Send message (HTTP fallback) |
| GET/POST/PUT/DELETE | `/api/admin/*` | JWT + ADMIN | Admin CRUD operations |

### 2.3 Database Models

| Model | Key Fields | Purpose |
|---|---|---|
| `User` | id (UUID), name, email, password (bcrypt), phone, role (ENUM), status | All user accounts |
| `DoctorProfile` | userId, specialization, experienceYears, bio, availabilityHours, isAvailable, imageUrl | Doctor-specific info (1:1 with User) |
| `Appointment` | patientId, doctorProfileId, appointmentDate, appointmentTime, reason, status, chatRequestStatus | Bookings |
| `HealthArticle` | title, category, content, symptoms, prevention, published | Medical articles |
| `HealthRecord` | userId, fileName, fileUrl, fileType, uploadedAt | Patient file uploads |
| `ActivityLog` | userId, activityType, description, metadata | Audit trail |
| `NotificationLog` | userId, type, event, status, payload, isRead | Notification history |
| `PushSubscription` | userId, endpoint, p256dh, auth | Web push subscriptions |
| `ExpoPushToken` | userId, token, platform | Mobile push tokens |
| `Message` | senderId, receiverId, content, messageType, read | Chat messages |

### 2.4 Associations

```
User 1:1 DoctorProfile
User 1:M Appointment (as patient)
DoctorProfile 1:M Appointment (as doctor)
User 1:M HealthRecord
User 1:M ActivityLog
User 1:M NotificationLog
User 1:M PushSubscription
User 1:M ExpoPushToken
User 1:M Message (as sender)
User 1:M Message (as receiver)
```

### 2.5 Authentication Flow

1. **Register** (`POST /api/auth/register`): Creates PATIENT user only. Validates email format, password length (6+), phone (10 digits). Returns JWT.
2. **Login** (`POST /api/auth/login`): Validates credentials, blocks ADMIN role (must use admin login). Returns JWT with `{id, name, email, role}` claims. 24h expiry.
3. **Admin Login** (`POST /api/auth/admin/login`): Only allows ADMIN role. Separate endpoint for security.
4. **Middleware** (`authenticateToken`): Extracts Bearer token from Authorization header, verifies JWT, attaches decoded user to `req.user`.
5. **Role Guard** (`requireRole`): Checks `req.user.role` against allowed roles. Supports single string or array.

### 2.6 Chat System (Socket.io)

**Connection:** Authenticated via JWT in `socket.handshake.auth.token`. Decoded user attached to socket.

**Features:**
- **Online tracking:** `Map<userId, Set<socketId>>` — supports multiple devices
- **Message sending:** `message:send` event validates appointment-based access (must have confirmed appointment with `chatRequestStatus: 'accepted'`), saves to DB, emits to receiver's room
- **Typing indicators:** `typing:start` / `typing:stop` forwarded to receiver
- **Read receipts:** `messages:read` marks messages as read and notifies sender
- **Online status:** `user:status` query returns whether user has active connections
- **Offline push:** If recipient is offline, sends web-push + Firebase push + creates NotificationLog

**Access control:** Only users with a confirmed appointment AND `chatRequestStatus: 'accepted'` can message each other.

### 2.7 Push Notifications

**Web (VAPID/web-push):**
- `PushSubscription` model stores browser push endpoints
- `sendPush(userId, title, body, url)` sends to all user's subscriptions
- Auto-cleans expired subscriptions (410/404)

**Mobile (Firebase FCM):**
- `ExpoPushToken` model stores FCM tokens
- `sendFirebasePush(userId, title, body, data)` sends via Firebase Admin SDK
- Supports both Android (high priority + channel) and iOS (sound + badge)
- Auto-removes invalid tokens

**Triggered by:** Appointment events, chat messages (when offline), admin actions

---

## 3. Frontend Architecture (Web)

### 3.1 Routing

Manual SPA router using `window.history.pushState` + `popstate` listener. No React Router dependency. Routes are matched via string comparison in `App.jsx`.

**Route categories:**
1. **Public:** `/`, `/login`, `/register`, `/doctors`, `/doctors/:id`, `/articles`, `/articles/:id`
2. **Admin:** `/admin/*` — requires `isAuthenticated && isAdmin`
3. **Authenticated:** `/dashboard`, `/appointments`, `/chats`, `/book`, `/profile`, `/patients/:id`, `/schedule`

### 3.2 Context Providers

```
ToastProvider (UI notifications)
  └─ AuthProvider (token, user, login/logout)
       └─ SocketProvider (Socket.io connection, real-time events)
            └─ CometChatWrapper (Step 2 addition)
                 └─ AppContent (route rendering)
```

**AuthContext:** Token in `localStorage`, auto-fetches `/api/profile` on mount, exposes `login()`, `logout()`, `isAuthenticated`, `isAdmin`.

**SocketContext:** Connects Socket.io with JWT auth. Listens for `message:received` (shows toast if not on /chats) and `notification:received`. Exposes `notificationTick` for bell refresh.

### 3.3 Pages

| Page | Route | Description |
|---|---|---|
| Home | `/` | Landing page with hero, features |
| Login | `/login` | Email/password login form |
| Register | `/register` | Patient self-registration |
| DoctorsDirectory | `/doctors` | Searchable doctor list |
| DoctorDetails | `/doctors/:id` | Doctor profile + book button |
| Articles | `/articles` | Health articles list |
| Dashboard | `/dashboard` | Role-based dashboard |
| Appointments | `/appointments` | User's appointments list |
| BookAppointment | `/book` | Appointment booking form |
| Chats | `/chats` | Dual-pane chat interface |
| Profile | `/profile` | Edit profile |
| PatientRecords | `/patients/:id` | Doctor views patient records |
| StaffSchedule | `/schedule` | Staff schedule view |
| AdminDashboard | `/admin` | System summary |
| UserManagement | `/admin/users` | User CRUD |
| ArticleManagement | `/admin/articles` | Article CRUD |
| ActivityLog | `/admin/activities` | Activity audit |
| NotificationLog | `/admin/notifications` | Notification history |

---

## 4. Mobile Architecture (Expo)

### 4.1 Navigation

```
AuthProvider
  └─ CometChatProvider
       └─ NavigationWrapper
            ├─ Auth Stack (Login, Register) — when user === null
            └─ App Stack — when user !== null
                 ├─ MainTabs (PatientTabs or DoctorTabs based on role)
                 ├─ Profile, AIChat, DoctorDetails, BookAppointment
                 ├─ Confirmation, ChatSimulation, Appointments
                 └─ (Stack screens shared across roles)
```

**PatientTabs:** Doctors | Articles | Dashboard | Chats | Records  
**DoctorTabs:** Home | Appointments | Chats | Profile

### 4.2 Services

**API (`src/services/api.js`):** Auto-detects Metro bundler IP for dev, uses `EXPO_PUBLIC_API_URL` for production. Request helper auto-attaches JWT from AsyncStorage.

**Notifications (`src/services/notifications.js`):** Gets FCM/APNs device push token, sends to backend, sets up Android channels, unregisters on logout.

### 4.3 Auth Context

Token in `AsyncStorage`. On mount, loads stored token → fetches profile. Blocks STAFF role from mobile login. Handles register → auto-login.

### 4.4 Socket.io (Global Listener)

In `NavigationWrapper`: connects Socket.io with JWT auth. Listens for `message:received` → shows local notification (if not on ChatSimulation screen). Listens for `notification:received` → shows local notification.

---

## 5. Admin Portal

### 5.1 User Management

- List all users with role/search/status filters + pagination
- Create doctor/staff accounts (admin-only; doctors get DoctorProfile)
- Edit user details (name, email, role, status, specialization)
- Deactivate accounts (soft delete via status → 'inactive')

### 5.2 Article Management

- List all articles with category filter
- Create/edit articles (title, category, content markdown, symptoms, prevention)
- Toggle published status
- Delete articles

### 5.3 Activity Log

- Paginated list of all system activities (login, register, admin actions)
- Shows userId, activityType, description, timestamp

### 5.4 Notification Log

- All notifications sent (app push events)
- Shows userId, type, event, status, timestamp, isRead

### 5.5 System Summary

- Total users by role
- Total appointments (confirmed vs cancelled)
- Total articles (published vs draft)
- Recent activity count

---

## 6. Database Seeding

`backend/database/seeders/seed.js` populates:
- 2 admin accounts (`admin.1@medicare.com`, `admin.2@medicare.com` / `Admin@123`)
- 30+ doctors across 11 specialties with profiles, bios, images
- 15 staff accounts
- 55 patients with realistic names
- 70 appointments (mix of past/future, 10% cancelled)
- 55 health records (one per patient)
- 15 health articles across categories (prevention, symptoms, nutrition, fitness, diseases)

All passwords follow pattern: `Admin@123`, `Doctor@123`, `Staff@123`, `Patient@123`

---

## 7. Docker Deployment

### Dockerfile (multi-stage)

1. **Stage 1:** `node:20-alpine` builds frontend (`npm ci && npm run build`)
2. **Stage 2:** `node:20-alpine` installs backend deps, copies source + built frontend into `/public`, creates non-root user, exposes 5000, healthcheck on `/api/doctors`
3. **Startup:** `node config/dbInit.js && node server.js` (dbInit creates DB if not exists)

### Docker Compose

- **db:** PostgreSQL 16-alpine, internal only (no host port), persistent volume, healthcheck
- **app:** Built from Dockerfile, port 5000 (all interfaces), depends on db healthy, env vars from `.env`, uploads volume

---

## 8. Key Design Patterns

| Pattern | Implementation |
|---|---|
| JWT Auth | Stateless tokens with role claims; 24h expiry |
| Role-based access | Middleware guards (`requireRole`); 4 roles: PATIENT, DOCTOR, STAFF, ADMIN |
| Connection-based chat | Chat only allowed between users with confirmed appointment + accepted chat request |
| Dual push channels | Web (VAPID) + Mobile (FCM) — separate token stores, unified notification log |
| SPA with server fallback | Frontend built into `/public`, Express serves `index.html` for all non-API routes |
| Real-time + HTTP fallback | Socket.io for live messaging; REST endpoints as fallback when socket disconnects |
| Activity logging | Every auth event + admin action creates ActivityLog entry |
| Non-root container | Docker adds `appuser` for security |

---

## 9. Environment Variables

```
DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME
JWT_SECRET
CORS_ORIGIN
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
FIREBASE_SERVICE_ACCOUNT
```

---

## 10. What Step 2 Adds (Without Modifying Step 1)

Step 2 (CometChat) adds:
- `cometChatUid` field to User model
- New models: WebhookLog, CallLog, AgentMetrics, DoctorSession
- New routes: `/api/cometchat/*`, `/api/webhooks/cometchat`, admin CometChat endpoints
- CometChat service layer (REST API wrapper)
- Frontend CometChat provider + rebuilt Chat page with UI Kit components
- Mobile CometChat provider + rebuilt chat screens
- Environment variables: `COMETCHAT_APP_ID`, `COMETCHAT_REGION`, `COMETCHAT_AUTH_KEY`, `COMETCHAT_REST_API_KEY`, `COMETCHAT_WEBHOOK_SECRET`

All Step 1 APIs, workflows, and notifications continue to function identically.

---

*Document generated: 2026-06-19*
