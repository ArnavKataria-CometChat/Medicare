# CometChat Voice & Video Call Integration

This document details the design, configuration, and implementation of voice and video calling features in the MediCare application using CometChat Calls SDK v5 (WebRTC).

**Current Status:** Web only. Mobile calling has been removed (packages uninstalled).

---

## 1. Dual-SDK Contract & Auth

Voice and video calling are driven by a dual-SDK setup on the Web:
1. **CometChat Chat SDK** (`@cometchat/chat-sdk-javascript@^4.1.11`): Handles signaling (initiating calls, ringing, accepting, rejecting).
2. **CometChat Calls SDK** (`@cometchat/calls-sdk-javascript@^5.0.1`): Establishes the peer-to-peer WebRTC media channel and renders the streams.

### Auth Sequence
The Calls SDK v5 maintains its own login state. Both SDKs must initialize and authenticate sequentially:
```
Initialize UIKit → Login UIKit → Initialize Calls SDK → Login Calls SDK
```

In our codebase (`frontend/src/cometchat/CometChatProvider.jsx`):
```javascript
// Step 1: Init UIKit
await CometChatUIKit.init(settings);

// Step 2: Init Calls SDK
await CometChatCalls.init({ appId, region });

// Step 3: Login UIKit (after sync with backend)
await CometChatUIKit.loginWithAuthToken(authToken);

// Step 4: Login Calls SDK
await CometChatCalls.loginWithAuthToken(authToken);
```

---

## 2. Doctor-Only Call Gating

Only doctors can initiate calls; patients can only receive and answer them.

In `frontend/src/pages/Chats.jsx`, call buttons are hidden for non-doctors:
```javascript
<CometChatMessageHeader
  user={selectedUser}
  {...((!isDoctorUser || !isChatAllowed) && { hideVideoCallButton: true, hideVoiceCallButton: true })}
/>
```

Group chats always hide call buttons:
```javascript
<CometChatMessageHeader
  group={selectedGroup}
  hideVideoCallButton={true}
  hideVoiceCallButton={true}
/>
```

---

## 3. Web Call Architecture

### 3.1 Incoming Call Overlay (Receiver/Patient)

`<CometChatIncomingCall />` is mounted at app root inside `CometChatProvider.jsx` with a fixed overlay:
```jsx
<div className="cometchat-call-overlay">
  <CometChatIncomingCall />
</div>
```

CSS ensures it appears above all other UI:
```css
.cometchat-call-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: 99999;
  pointer-events: none;
}
.cometchat-call-overlay > * {
  pointer-events: auto;
}
```

### 3.2 Ongoing Call Elevation (Initiator/Doctor)

**Problem:** When the doctor initiates a call, `CometChatMessageHeader` renders the ongoing call UI _inside itself_. The Chats page container has `position: fixed; z-index: 50` which creates a stacking context — the call UI cannot escape it with CSS alone.

**Solution:** The `OngoingCallElevator` component uses a `MutationObserver` to detect `.cometchat-ongoing-call` appearing in the DOM, then **physically moves the DOM element** into a new `position: fixed` overlay directly on `document.body` at `z-index: 2147483647` (max 32-bit int).

```javascript
function OngoingCallElevator() {
  useEffect(() => {
    const overlay = document.createElement('div');
    overlay.className = 'cometchat-call-elevator';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;display:none;';
    document.body.appendChild(overlay);

    // MutationObserver detects .cometchat-ongoing-call, moves it to overlay
    // Poll every 500ms to detect call end (iframe removed) and hide overlay
  }, []);
  return null;
}
```

**Call end detection:** A 500ms polling interval checks if the call iframe still exists inside the overlay element. When it disappears (call ended), the overlay is hidden and cleared.

### 3.3 CSS Override

In `frontend/src/index.css`, the ongoing call element is forced to fill its container:
```css
.cometchat-call-elevator .cometchat-ongoing-call,
.cometchat-call-elevator .cometchat:has(> .cometchat-ongoing-call) {
  width: 100% !important;
  height: 100% !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  border-radius: 0 !important;
}
```

---

## 4. Mobile Calling — REMOVED

Mobile calling (`@cometchat/calls-sdk-react-native`, `lib-jitsi-meet`, `react-native-webrtc`, `react-native-video`, `react-native-background-timer`) has been completely removed from the mobile app as of 2026-06-22.

**Removed files:**
- `mobile/src/components/CallSurfaces.js` (deleted)

**Removed from `mobile/package.json`:**
- `@cometchat/calls-sdk-react-native`
- `lib-jitsi-meet`
- `react-native-webrtc`
- `react-native-video`
- `react-native-background-timer`
- `@xmldom/xmldom`
- `abab`

**Cleaned files:**
- `mobile/metro.config.js` — stripped calls SDK resolution workarounds, now basic Expo config
- `mobile/src/context/CometChatContext.js` — removed CometChatCalls import/init/login
- `mobile/src/screens/ChatSimulationScreen.js` — removed `hideVideoCallButton`/`hideVoiceCallButton` props

---

## 5. Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Call UI rendering (web) | DOM reparenting via MutationObserver | CSS `position: fixed` cannot escape a parent stacking context created by `position: fixed; z-index: 50` on the Chats container |
| Call end detection | Polling for iframe removal (500ms) | CometChat empties the call div rather than removing it; `MutationObserver` on `childList` alone isn't reliable |
| Incoming call mount point | App-root level (inside CometChatProvider) | Must receive calls on any page, not just `/chats` |
| Mobile calls | Removed entirely | Implementation was unstable; web-only approach for now |
| Calls SDK version | `@5` pinned | npm `latest` tag still points to v4 |

---

*Last updated: 2026-06-22*
