# CometChat Skills — Gaps & Undocumented Fixes

This document tracks issues encountered during CometChat integration that were **NOT covered** by the `.claude/skills/cometchat-*` skill files. These are platform-specific workarounds, bundler fixes, and implementation patterns that had to be discovered through debugging or from the `.antigravity` reference implementation.

---

## 1. Metro Bundler Cannot Parse Calls SDK CommonJS Entry

**Problem:** `@cometchat/calls-sdk-react-native` ships a CommonJS `dist/index.js` that Metro cannot bundle — it triggers cascading "Unable to resolve" errors for `@cometchat/calls-lib-webrtc`, `valibot`, `react-native-webrtc`, etc.

**Root cause:** The CJS entry uses `require()` with minified variable names and references native modules that Metro tries to statically resolve at bundle time.

**Fix (from .antigravity):** Override Metro's `resolveRequest` to point directly at the ESModule `.mjs` entry:

```javascript
// metro.config.js
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@cometchat/calls-sdk-react-native') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@cometchat/calls-sdk-react-native/dist/index.mjs'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};
```

**Skills gap:** No CometChat skill mentions Metro bundler issues or the `.mjs` redirect. The `cometchat-native-calls` and `cometchat-native-expo-patterns` skills discuss init order, VoIP push, and native permissions — but never the bundler failure that prevents the SDK from even loading.

---

## 2. `@xmldom/xmldom` Must Be Pinned to `^0.8.11`

**Problem:** The Calls SDK's browser polyfills (`dist/polyfills/browser.js`) use xmldom's `DOMParser`. Version 0.9.x of `@xmldom/xmldom` changed internal APIs, causing a runtime crash: `Cannot set property 'innerHTML' of undefined`.

**Fix:** Pin in `package.json`:
```json
"@xmldom/xmldom": "^0.8.11"
```

**Skills gap:** The `cometchat-native-calls` skill lists peer deps (`react-native-webrtc`, `text-encoding`, etc.) but never mentions the xmldom version constraint. The crash only manifests at runtime after the bundle succeeds.

---

## 3. Mobile Call Surfaces Require Absolute Overlay Component

**Problem:** On React Native, CometChat's call UI components (`<CometChatIncomingCall />`, `<CometChatOutgoingCall />`, `<CometChatOngoingCall />`) are NOT self-mounting — they don't appear automatically like on web. You must build a dedicated overlay component.

**Fix (from .antigravity):** Create a `<CallSurfaces />` component mounted at the app root (adjacent to the navigator) that:
1. Registers `CometChat.addCallListener` for server-side call events
2. Registers `CometChatUIEventHandler.addCallListener` for client-side UI events
3. Manages state to show/hide absolute-positioned call overlays
4. Requests camera/mic permissions dynamically on Android before rendering call UI

```javascript
// Mounted in App.js alongside NavigationContainer
<CallSurfaces />
```

**Skills gap:** The `cometchat-native-calls` skill discusses "IncomingCall at app root" conceptually but doesn't explain that on RN you need a custom state-machine component with dual listeners (SDK + UIEventHandler) and absolute positioning. The web skill's `<CometChatIncomingCall />` pattern doesn't translate directly to mobile.

---

## 4. Web `<CometChatIncomingCall />` Must Live Inside Provider

**Problem:** On web, if `<CometChatIncomingCall />` is only in the Chat page component, incoming calls are missed when the user is on any other page.

**Fix (from .antigravity):** Mount it inside `CometChatProvider.jsx` so it renders on ALL pages:

```jsx
return (
  <CometChatContext.Provider value={{ isReady, error, cometChatUid }}>
    {isReady && <CometChatIncomingCall />}
    {children}
  </CometChatContext.Provider>
);
```

**Skills gap:** The `cometchat-react-calls` skill §1.7 says "IncomingCall mounted at app root" — but the placement detail (inside the provider, gated by `isReady`) is not spelled out. Easy to miss if you only add call buttons to the chat page.

---

## 5. `try/catch require()` Does NOT Work for Metro Resolution

**Problem:** Wrapping CometChat imports in `try { require(...) } catch {}` does not gracefully handle missing native modules because Metro resolves all `require()` calls at **bundle time**, not runtime. If Metro can't find the module, the bundle fails entirely — the catch never executes.

**What works instead:**
- For Expo Go fallback: Check for native module availability at runtime AFTER the bundle succeeds (only possible if Metro can resolve the JS entry)
- For proper fix: Use the `resolveRequest` Metro override (item #1 above) so Metro can actually bundle the SDK

**Skills gap:** No skill discusses the distinction between Metro bundle-time resolution vs runtime execution. The `cometchat-native-core` skill's "if not available, skip" pattern assumes the bundle succeeds first.

---

## 6. Peer Dependencies Not Fully Listed in Skills

**Problem:** The Calls SDK has peer deps that aren't listed in any skill file:

| Package | Why needed | Listed in skills? |
|---|---|---|
| `@cometchat/calls-lib-webrtc` | WebRTC bridge (custom tarball from Cloudsmith) | No |
| `valibot` | Schema validation used internally | No |
| `zustand` | State management for calls UI | No |
| `react-native-performance` | Performance polyfill | No |
| `promise.allsettled` | Promise polyfill | No |
| `react-native-url-polyfill` | URL polyfill | No |
| `react-native-background-timer` | Background task scheduling | No |
| `text-encoding` | TextEncoder/TextDecoder polyfill | Mentioned in passing |
| `abab` | atob/btoa polyfill | No |
| `@xmldom/xmldom` | DOMParser polyfill | No (and needs version pin) |
| `react-native-localize` | Native locale module | No |
| `react-native-webrtc` | WebRTC native module | Mentioned |

**Skills gap:** The `cometchat-native-calls` skill peerDeps section only lists `@xmldom/xmldom`, `abab`, `promise.allsettled`, `text-encoding`, `valibot`, `@cometchat/calls-lib-webrtc`, and `zustand` — but doesn't mention `react-native-performance`, `react-native-url-polyfill`, `react-native-background-timer`, or `react-native-localize`, all of which are required at runtime and cause sequential crashes if missing.

---

## 7. Production Database Doesn't Auto-Alter

**Problem:** In production mode (`NODE_ENV=production`), Sequelize uses `sync()` without `{ alter: true }`, so new columns (like `cometChatUid`) and new tables added to models are NOT automatically created.

**Fix:** Run ALTER TABLE manually in the database container, or use migrations.

**Skills gap:** Not a CometChat skill issue per se, but the `cometchat-production` skill says "add `cometChatUid` to User model" without noting that production deployments need a migration or manual DDL.

---

## Summary

The CometChat skills are strong on **architecture, patterns, and API usage** but weak on:
1. **Platform-specific bundler workarounds** (Metro config, module resolution)
2. **Exact version constraints** for transitive dependencies
3. **Mobile-specific UI mounting patterns** (absolute overlays, dual listeners)
4. **The full peer dependency tree** for the Calls SDK on React Native

The `.antigravity` reference filled these gaps through empirical debugging.

---

*Last updated: 2026-06-19*
