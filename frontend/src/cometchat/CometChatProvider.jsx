import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CometChatUIKit, UIKitSettingsBuilder, CometChatIncomingCall } from '@cometchat/chat-uikit-react';
import { CometChatCalls } from '@cometchat/calls-sdk-javascript';
import { CometChat } from '@cometchat/chat-sdk-javascript';
import { formatCometChatError, logCometChatError } from './errors';
import CometChatNotifier from './CometChatNotifier';
import { useToast } from '../context/ToastContext';
import { registerFcmWebPush, unregisterFcmWebPush } from './registerFcmWebPush';

/**
 * OngoingCallElevator — watches for .cometchat-ongoing-call appearing in the DOM
 * and reparents it to a fixed overlay at body level so it breaks out of any stacking context.
 * Uses a polling interval to detect when the call ends (iframe removed) and hides the overlay.
 */
function OngoingCallElevator() {
  useEffect(() => {
    const overlay = document.createElement('div');
    overlay.className = 'cometchat-call-elevator';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;display:none;';
    document.body.appendChild(overlay);

    let active = false;
    let pollInterval = null;

    function hideOverlay() {
      overlay.style.display = 'none';
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
      active = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    }

    const observer = new MutationObserver(() => {
      if (active) return; // Already showing — let the poll handle cleanup
      const el = document.querySelector('.cometchat-ongoing-call:not(.cometchat-call-elevator .cometchat-ongoing-call)');
      if (el) {
        active = true;
        overlay.style.display = 'block';
        overlay.appendChild(el);
        // Poll every 500ms to check if call ended (iframe removed from inside the element)
        pollInterval = setInterval(() => {
          const callEl = overlay.querySelector('.cometchat-ongoing-call');
          if (!callEl || (!callEl.querySelector('iframe') && !callEl.querySelector('[class*="call"]'))) {
            hideOverlay();
          }
        }, 500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (pollInterval) clearInterval(pollInterval);
      overlay.remove();
    };
  }, []);

  return null;
}

const CometChatContext = createContext({
  isReady: false,
  error: null,
  cometChatUid: null,
});

export const useCometChat = () => useContext(CometChatContext);

// Module-level guards for init + login (prevents StrictMode double-invoke issues)
let initialized = false;
let loginInFlight = null;

/**
 * CometChatProvider
 *
 * Handles the full CometChat lifecycle:
 * 1. Fetches appId + region from backend (GET /api/cometchat/config)
 * 2. Initializes CometChatUIKit
 * 3. Syncs user via backend (POST /api/cometchat/sync) to get an auth token
 * 4. Logs in with the server-minted auth token (never raw API keys on client)
 * 5. Initializes Calls SDK
 *
 * Renders children only after init + login succeeds.
 * Does NOT render if user is STAFF (no messaging access).
 */
export function CometChatProvider({ token, user, children }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [cometChatUid, setCometChatUid] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    // Reset ready states on auth/user changes to force unmount and prevent stale sessions
    setIsReady(false);
    setCometChatUid(null);

    // Staff have no CometChat access — skip entirely
    if (!token || !user || user.role === 'STAFF') {
      if (!token && initialized) {
        // Unregister push token before logout (non-blocking)
        unregisterFcmWebPush().catch(() => {});
        CometChat.logout()
          .then(() => {
            try {
              CometChatUIKit.logout().catch(() => {});
            } catch {}
            initialized = false;
            loginInFlight = null;
          })
          .catch((err) => console.warn('[CometChat] Reactive logout failed:', err));
      }
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        // 1. Fetch public config from backend
        const configRes = await fetch('/api/cometchat/config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!configRes.ok) throw new Error('Failed to fetch CometChat config');
        const { appId, region } = await configRes.json();

        if (!appId || !region) {
          console.warn('[CometChat] appId or region not configured. Skipping init.');
          return;
        }

        // 2. Initialize CometChat UI Kit (once)
        if (!initialized) {
          const settings = new UIKitSettingsBuilder()
            .setAppId(appId)
            .setRegion(region)
            .subscribePresenceForAllUsers()
            .build();

          await CometChatUIKit.init(settings);
          initialized = true;

          // 2b. Initialize Calls SDK
          const callsInit = await CometChatCalls.init({ appId, region });
          if (!callsInit?.success) {
            console.warn('[CometChat] Calls SDK init returned non-success:', callsInit?.error);
          }
        }

        // 3. Sync user with backend → get auth token
        const syncRes = await fetch('/api/cometchat/sync', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.error || `Sync failed with status ${syncRes.status}`);
        }

        const { cometChatUid: uid, authToken } = await syncRes.json();

        if (cancelled) return;

        // 4. Login with auth token (with in-flight guard for StrictMode)
        let existing = null;
        try {
          existing = await CometChat.getLoggedinUser();
        } catch {
          try {
            existing = await CometChatUIKit.getLoggedinUser();
          } catch {}
        }

        if (existing && existing.getUid() !== uid) {
          console.log(`[CometChat] Logged in user mismatch (${existing.getUid()} vs ${uid}). Logging out...`);
          try {
            await CometChatUIKit.logout();
          } catch {
            await CometChat.logout();
          }
          try {
            if (CometChatCalls.getLoggedInUser()) {
              await CometChatCalls.logout();
            }
          } catch {}
          existing = null;
        }

        if (!existing) {
          if (loginInFlight) {
            await loginInFlight;
          } else {
            loginInFlight = CometChatUIKit.loginWithAuthToken(authToken);
            try {
              await loginInFlight;
            } finally {
              loginInFlight = null;
            }
          }
        }

        // 4b. Login Calls SDK
        if (!CometChatCalls.getLoggedInUser()) {
          await CometChatCalls.loginWithAuthToken(authToken);
        }

        if (cancelled) return;

        setCometChatUid(uid);
        setIsReady(true);

        registerFcmWebPush((payload) => {
          // Foreground push callback — show in-app toast
          const notification = payload.notification || {};
          const data = payload.data || {};

          // Suppress notifications for AI Assistant replies
          if (data.sender === 'medicare_ai_assistant' || data.senderName === 'MediCare AI Assistant') {
            return;
          }

          const title = notification.title || data.title || '';
          const body = notification.body || data.alert || 'New message';
          if (addToast && title) {
            addToast(`💬 ${title}: ${body}`, 'info');
          }
        }).catch((err) => {
          console.warn('[CometChat] FCM push registration failed (non-fatal):', err);
        });
      } catch (e) {
        if (cancelled) return;
        logCometChatError(e);
        setError(formatCometChatError(e));
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  // Staff users — render children without CometChat
  if (user?.role === 'STAFF') {
    return <>{children}</>;
  }

  // Not authenticated — render children without CometChat
  if (!token || !user) {
    return <>{children}</>;
  }

  // Error state
  if (error) {
    // Non-fatal: render children anyway but log the error
    console.warn('[CometChatProvider] Init failed — chat features disabled:', error);
    return <>{children}</>;
  }

  // Loading state — still render children (chat components will show loading internally)
  return (
    <CometChatContext.Provider value={{ isReady, error, cometChatUid }}>
      {isReady && (
        <>
          <style>{`
            .cometchat-call-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              z-index: 99999;
              pointer-events: none;
            }
            .cometchat-call-overlay > * {
              pointer-events: auto;
            }
          `}</style>
          <div className="cometchat-call-overlay">
            <CometChatIncomingCall />
          </div>
          <OngoingCallElevator />
          <CometChatNotifier isReady={isReady} addToast={addToast} />
        </>
      )}
      {children}
    </CometChatContext.Provider>
  );
}

export default CometChatProvider;
