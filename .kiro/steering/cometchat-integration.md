---
inclusion: auto
---

# CometChat Integration — Master Steering

This project (Medicare) integrates CometChat for in-app messaging and calling across two platforms:

- **Frontend (Web):** React 18 + Vite (`/frontend`) — uses `@cometchat/chat-uikit-react` + `@cometchat/chat-sdk-javascript`
- **Mobile (Expo):** React Native 0.81 + Expo 54 (`/mobile`) — uses `@cometchat/chat-uikit-react-native` + `@cometchat/chat-sdk-react-native`

## Skill Reference Files

All CometChat skills are located at `.claude/skills/cometchat-*/SKILL.md`. When working on CometChat integration, consult:

### Web (React/Vite) — `/frontend`

| Skill | Path | Purpose |
|---|---|---|
| Dispatcher | #[[file:.claude/skills/cometchat/SKILL.md]] | Entry-point — detects framework, routes to correct skills |
| Core | #[[file:.claude/skills/cometchat-core/SKILL.md]] | Init, login, provider pattern, env vars, SSR safety, error handling |
| Components | #[[file:.claude/skills/cometchat-components/SKILL.md]] | Component catalog — names, props, composition |
| Placement | #[[file:.claude/skills/cometchat-placement/SKILL.md]] | WHERE to put chat (route, modal, drawer, widget, embedded) |
| React Patterns | #[[file:.claude/skills/cometchat-react-patterns/SKILL.md]] | Vite/CRA-specific patterns |
| Calls | #[[file:.claude/skills/cometchat-calls/SKILL.md]] | Voice/video calling dispatcher |
| React Calls | #[[file:.claude/skills/cometchat-react-calls/SKILL.md]] | Web calling integration (WebRTC, getUserMedia) |
| Features | #[[file:.claude/skills/cometchat-features/SKILL.md]] | Enable features (reactions, polls, file sharing, etc.) |
| Customization | #[[file:.claude/skills/cometchat-customization/SKILL.md]] | Custom views, bubbles, headers, event listeners |
| Theming | #[[file:.claude/skills/cometchat-theming/SKILL.md]] | CSS variables, dark mode, brand colors |
| Production | #[[file:.claude/skills/cometchat-production/SKILL.md]] | Server-side token auth, user management |
| Troubleshooting | #[[file:.claude/skills/cometchat-troubleshooting/SKILL.md]] | Diagnose and fix integration problems |

### Mobile (React Native / Expo) — `/mobile`

| Skill | Path | Purpose |
|---|---|---|
| Native Core | #[[file:.claude/skills/cometchat-native-core/SKILL.md]] | RN init, login, provider, env vars |
| Native Components | #[[file:.claude/skills/cometchat-native-components/SKILL.md]] | RN component catalog (different props from web) |
| Native Placement | #[[file:.claude/skills/cometchat-native-placement/SKILL.md]] | WHERE to put chat in navigation structure |
| Expo Patterns | #[[file:.claude/skills/cometchat-native-expo-patterns/SKILL.md]] | Expo-specific patterns and gotchas |
| Native Calls | #[[file:.claude/skills/cometchat-native-calls/SKILL.md]] | Voice/video for RN (CallKit, VoIP push) |
| Native Features | #[[file:.claude/skills/cometchat-native-features/SKILL.md]] | Enable features on mobile |
| Native Theming | #[[file:.claude/skills/cometchat-native-theming/SKILL.md]] | Mobile theming |
| Native Push | #[[file:.claude/skills/cometchat-native-push/SKILL.md]] | Push notifications for mobile |
| Native Production | #[[file:.claude/skills/cometchat-native-production/SKILL.md]] | Production auth for mobile |
| Native Testing | #[[file:.claude/skills/cometchat-native-testing/SKILL.md]] | Testing CometChat on mobile |
| Native Troubleshooting | #[[file:.claude/skills/cometchat-native-troubleshooting/SKILL.md]] | Fix mobile integration issues |

### Cross-Platform

| Skill | Path | Purpose |
|---|---|---|
| Accessibility | #[[file:.claude/skills/cometchat-a11y/SKILL.md]] | Accessibility compliance |
| i18n | #[[file:.claude/skills/cometchat-i18n/SKILL.md]] | Internationalization / translations |

## Critical Rules (from skills + SOW Step 2)

1. **Never mix web and native SDKs.** `@cometchat/chat-uikit-react` is web-only. `@cometchat/chat-uikit-react-native` is mobile-only.
2. **Init order matters:** Chat SDK init → Chat SDK login → Calls SDK init → Calls SDK login.
3. **Token-based auth from day one:** Client NEVER sees API keys. Backend mints tokens via `/api/cometchat/sync`. Client uses `loginWithAuthToken(token)`.
4. **Guard concurrent login** with a module-level in-flight promise (React 18 StrictMode double-mounts).
5. **Error formatting:** Never use `String(e)` on CometChat errors — always use `formatCometChatError()`.
6. **CSS import once** at app root for web: `import "@cometchat/chat-uikit-react/css-variables.css"`.
7. **Calls SDK v5:** Pin to `@5` on npm — `latest` tag still points to v4.
8. **CometChatIncomingCall** must mount at app root (above route boundary) so calls ring on every screen.
9. **OngoingCallElevator** (web): Uses MutationObserver + DOM reparenting to move `.cometchat-ongoing-call` to `document.body` level. CSS alone cannot break out of parent stacking contexts.
10. **UID strategy:** `medicare_user_{USER.id}` — deterministic, stored in `USER.cometChatUid`.
11. **Role enforcement:** Patients cannot initiate calls (hide UI + SDK-level block). Staff get no messaging.
12. **All changes are additive.** No Step 1 APIs, workflows, or screens are modified.
13. **Webhook validation:** HMAC signature required on all incoming CometChat webhooks.
14. **Mobile calling removed.** Web-only calling for now due to Expo managed workflow limitations.

## Tracking Documents

- Skills usage reference: #[[file:.kiro/docs/cometchat-skills-usage.md]]
- Code changes tracker: #[[file:.kiro/docs/cometchat-code-changes.md]]

## SOW Step 2 Integration Requirements (Summary)

Source: `SCOPE_OF_WORK_STEP2 (1).md`

### Core Features
- **User Sync:** All roles (Patient, Doctor, Staff) synced transparently on login via `POST /api/cometchat/sync`
- **1:1 Chat:** Patient↔Doctor, Doctor↔Doctor. Block Patient↔Patient.
- **Group Chat:** Doctors create groups, add patients/peers
- **Voice/Video Calling:** Ringing mode, doctor-initiated only, patients receive/accept
- **Agent Chat:** Staff sub-type with `role:agent` tag; patient support flow
- **Moderation:** Keyword filter, spam detection, flagged content review
- **Webhooks:** `POST /api/webhooks/cometchat` with HMAC validation → `WEBHOOK_LOG` table
- **Push Notifications:** CometChat push alongside existing app push; unified `NOTIFICATION_LOG`

### Role Access Matrix
| From → To | Text/Media | Calls |
|---|---|---|
| Patient → Doctor | Yes (if connected) | Cannot initiate |
| Doctor → Patient | Yes | Can initiate |
| Doctor → Doctor | Yes | No restriction |
| Patient → Patient | Blocked | Blocked |
| Staff → Any | No messaging | No calling |
| Admin → Any | Full access | Full access |

### Database Changes
- `USER.cometChatUid` — nullable string, populated on first sync
- `WEBHOOK_LOG` — new table (id, source, eventType, payload, status, receivedAt)
- `NOTIFICATION_LOG.type` — enum extended with `"cometchat"`

### New Backend APIs
- `POST /api/cometchat/sync` — sync user + return auth token
- `GET /api/cometchat/contacts` — role-filtered contact list
- `POST /api/webhooks/cometchat` — webhook receiver (HMAC-validated)
- `GET /api/admin/webhooks` — paginated webhook log

### Key Constraint
All changes are ADDITIVE. No Step 1 APIs, workflows, screens, or notifications are modified.
