# CometChat Skills Usage Reference

This document catalogs all CometChat skills installed in this project and when to use each one during integration work.

---

## How Skills Work

Skills are structured knowledge files (`.claude/skills/cometchat-*/SKILL.md`) that provide authoritative patterns, rules, and anti-patterns for CometChat integration. They replace guesswork with verified, source-checked integration recipes.

**Key principle:** Always consult the relevant skill BEFORE writing integration code. Never invent component names, prop signatures, or init patterns from memory.

---

## Skills Relevant to This Project

### Medicare Project Stack
- **Web:** React 18 + Vite 5 (`/frontend`) — family: `web`
- **Mobile:** Expo 54 + React Native 0.81 + React Navigation (`/mobile`) — family: `native`
- **Backend:** Node.js (`/backend`)

---

## 1. Dispatcher (Entry Point)

| Skill | File | When to Use |
|---|---|---|
| `cometchat` | `.claude/skills/cometchat/SKILL.md` | Starting any CometChat integration from scratch. Detects framework, gathers requirements, routes to correct sub-skills. Use when: "add chat", "integrate CometChat", first-time setup. |
| `cometchat-calls` | `.claude/skills/cometchat-calls/SKILL.md` | Adding voice/video calling to any platform. Detects family, picks standalone vs additive mode, routes to per-family calls skill. Use when: "add calls", "add video calling". |

---

## 2. Web Skills (React / Vite — `/frontend`)

### Core & Setup

| Skill | File | When to Use |
|---|---|---|
| `cometchat-core` | `.claude/skills/cometchat-core/SKILL.md` | **Always read first** for web integration. Covers: UIKitSettingsBuilder init, login (dev + production), CSS import, env vars (`VITE_` prefix), provider pattern, StrictMode login guard, error formatting. |
| `cometchat-react-patterns` | `.claude/skills/cometchat-react-patterns/SKILL.md` | Vite/CRA-specific integration patterns: file structure, routing integration, flex-shrink traps, hot-reload safety. |

### UI & Composition

| Skill | File | When to Use |
|---|---|---|
| `cometchat-components` | `.claude/skills/cometchat-components/SKILL.md` | **Check before writing any `<CometChat*>` JSX.** Complete catalog of component names, props, imports. If a component isn't here, it doesn't exist. |
| `cometchat-placement` | `.claude/skills/cometchat-placement/SKILL.md` | Deciding WHERE chat goes — route (full page), modal, drawer, embedded panel, floating widget. Use when user says "add chat to my app" without specifying where. |
| `cometchat-customization` | `.claude/skills/cometchat-customization/SKILL.md` | Modifying component appearance/behavior: custom bubbles, header views, subtitle views, request builder filters, event listeners. Use AFTER basic integration is working. |
| `cometchat-theming` | `.claude/skills/cometchat-theming/SKILL.md` | CSS variable overrides, brand colors, dark mode, font changes. Scope to `.cometchat` not `:root`. |

### Calling

| Skill | File | When to Use |
|---|---|---|
| `cometchat-react-calls` | `.claude/skills/cometchat-react-calls/SKILL.md` | Web voice/video: Calls SDK v5 install (`@5` tag), dual-SDK init, ringing vs session mode, `getUserMedia`, container dimension traps, `CometChatIncomingCall` at root. |

### Features & Production

| Skill | File | When to Use |
|---|---|---|
| `cometchat-features` | `.claude/skills/cometchat-features/SKILL.md` | Adding features to an existing integration: reactions, polls, file sharing, typing indicators, AI smart replies. Routes by feature tier (zero-config vs API toggle vs package install). |
| `cometchat-production` | `.claude/skills/cometchat-production/SKILL.md` | Going to production: replace `authKey` with server-minted tokens, user CRUD (create on signup, update on profile change), security hardening. |
| `cometchat-react-push` | `.claude/skills/cometchat-react-push/SKILL.md` | Web push notifications (Service Worker + Notification API). |
| `cometchat-react-testing` | `.claude/skills/cometchat-react-testing/SKILL.md` | Testing CometChat web integration. |

### Troubleshooting

| Skill | File | When to Use |
|---|---|---|
| `cometchat-troubleshooting` | `.claude/skills/cometchat-troubleshooting/SKILL.md` | Something broke: blank screen, 401 errors, CSS not loading, messages not showing. Run `cometchat doctor` first, then consult this skill. |

---

## 3. Mobile Skills (React Native / Expo — `/mobile`)

### Core & Setup

| Skill | File | When to Use |
|---|---|---|
| `cometchat-native-core` | `.claude/skills/cometchat-native-core/SKILL.md` | **Always read first** for mobile. RN init, login, provider, env vars (`EXPO_PUBLIC_` prefix), lifecycle differences from web. |
| `cometchat-native-expo-patterns` | `.claude/skills/cometchat-native-expo-patterns/SKILL.md` | Expo-specific: managed workflow constraints, config plugins, EAS build considerations. |

### UI & Composition

| Skill | File | When to Use |
|---|---|---|
| `cometchat-native-components` | `.claude/skills/cometchat-native-components/SKILL.md` | RN component catalog. **Props differ from web** (`onItemPress` not `onItemClick`). Never copy web props to mobile. |
| `cometchat-native-placement` | `.claude/skills/cometchat-native-placement/SKILL.md` | WHERE chat goes in navigation: tab navigator screen, stack screen, modal screen. |
| `cometchat-native-theming` | `.claude/skills/cometchat-native-theming/SKILL.md` | Mobile theming (different from CSS variables — uses theme object). |
| `cometchat-native-customization` | `.claude/skills/cometchat-native-customization/SKILL.md` | Custom views and overrides in RN context. |

### Calling & Push

| Skill | File | When to Use |
|---|---|---|
| `cometchat-native-calls` | `.claude/skills/cometchat-native-calls/SKILL.md` | Mobile voice/video: CallKit (iOS), VoIP push (mandatory for standalone mode), foreground service (Android). |
| `cometchat-native-push` | `.claude/skills/cometchat-native-push/SKILL.md` | Push notifications: FCM (Android), APNs (iOS), Expo push token registration. |

### Features & Production

| Skill | File | When to Use |
|---|---|---|
| `cometchat-native-features` | `.claude/skills/cometchat-native-features/SKILL.md` | Enable features on mobile. |
| `cometchat-native-production` | `.claude/skills/cometchat-native-production/SKILL.md` | Production auth for mobile, token handling. |
| `cometchat-native-testing` | `.claude/skills/cometchat-native-testing/SKILL.md` | Testing mobile CometChat integration. |
| `cometchat-native-troubleshooting` | `.claude/skills/cometchat-native-troubleshooting/SKILL.md` | Fix mobile-specific issues. |

---

## 4. Cross-Platform Skills

| Skill | File | When to Use |
|---|---|---|
| `cometchat-a11y` | `.claude/skills/cometchat-a11y/SKILL.md` | Accessibility compliance — ARIA labels, keyboard nav, screen reader support. |
| `cometchat-i18n` | `.claude/skills/cometchat-i18n/SKILL.md` | Internationalization — `CometChatLocalize`, translations, RTL support. |

---

## 5. Skill Usage Workflow

### New Integration (from scratch)
1. Start with `cometchat` (dispatcher) — it detects framework and routes
2. Load `cometchat-core` (web) or `cometchat-native-core` (mobile)
3. Load `cometchat-components` / `cometchat-native-components` for component catalog
4. Load `cometchat-placement` / `cometchat-native-placement` for WHERE question
5. Load framework pattern skill (`cometchat-react-patterns` / `cometchat-native-expo-patterns`)

### Adding Calls
1. Start with `cometchat-calls` (dispatcher)
2. Routes to `cometchat-react-calls` (web) or `cometchat-native-calls` (mobile)
3. Resolve ringing vs session mode FIRST

### Customizing Appearance
1. `cometchat-theming` for colors/fonts/dark mode
2. `cometchat-customization` for component-level overrides (custom bubbles, views)

### Adding Features
1. `cometchat-features` — check the feature tier (most are zero-config)
2. Only features requiring package installs (calls) need code changes

### Going to Production
1. `cometchat-production` / `cometchat-native-production` — token auth
2. `cometchat-native-push` — push notifications for mobile

### Fixing Issues
1. `cometchat-troubleshooting` / `cometchat-native-troubleshooting`
2. Run `cometchat doctor` first

---

## 6. Skills NOT Relevant to This Project

These are installed but not applicable to the Medicare stack:

- `cometchat-angular-*` — Angular framework (not used)
- `cometchat-android-v5-*` / `cometchat-android-v6-*` — Native Android (using Expo instead)
- `cometchat-flutter-v5-*` / `cometchat-flutter-v6-*` — Flutter (not used)
- `cometchat-ios-*` — Native iOS (using Expo instead)
- `cometchat-nextjs-patterns` — Next.js (using Vite)
- `cometchat-react-router-patterns` — React Router framework mode (not used)
- `cometchat-astro-patterns` — Astro (not used)
- `cometchat-native-bare-patterns` — Bare RN CLI (using Expo managed)

---

## 7. Quick Reference — Key Packages

### Web (`/frontend`)
```
@cometchat/chat-uikit-react    — UI Kit (components)
@cometchat/chat-sdk-javascript — Chat SDK (signaling, data)
@cometchat/calls-sdk-javascript@5 — Calls SDK (WebRTC) — pin to @5!
```

### Mobile (`/mobile`)
```
@cometchat/chat-uikit-react-native — UI Kit (RN components)
@cometchat/chat-sdk-react-native   — Chat SDK (RN)
@cometchat/calls-sdk-react-native  — Calls SDK (RN)
```

### Env Variables

Per SOW Step 2, credentials live on the backend ONLY. The client gets an auth token via `/api/cometchat/sync`.

```
# Backend (/.env or /backend/.env)
COMETCHAT_APP_ID=
COMETCHAT_REGION=
COMETCHAT_AUTH_KEY=
COMETCHAT_REST_API_KEY=
COMETCHAT_WEBHOOK_SECRET=
```

The client SDK uses `loginWithAuthToken(token)` — no `VITE_` or `EXPO_PUBLIC_` CometChat env vars needed on the client side.

---

*Last updated: 2026-06-18*
