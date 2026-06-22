import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../services/api';
import { AuthContext } from './AuthContext';

let CometChatUIKit = null;
let CometChat = null;
let CometChatCalls = null;

// Try to import CometChat — may fail in Expo Go (no native modules)
try {
  const uikit = require('@cometchat/chat-uikit-react-native');
  CometChatUIKit = uikit.CometChatUIKit;
  CometChat = require('@cometchat/chat-sdk-react-native').CometChat;
} catch (e) {
  console.warn('[CometChat] UI Kit or SDK not available:', e.message, e.stack);
}

// Try to import Calls SDK — may fail in Expo Go
try {
  CometChatCalls = require('@cometchat/calls-sdk-react-native').CometChatCalls;
} catch (e) {
  console.warn('[CometChat] Calls SDK not available:', e.message);
}

const CometChatContext = createContext({
  isReady: false,
  error: null,
  cometChatUid: null,
});

export const useCometChatContext = () => useContext(CometChatContext);

// Module-level guards
let initialized = false;
let loginInFlight = null;

/**
 * Formats CometChat errors into readable strings.
 */
function formatError(e) {
  if (e == null) return 'Unknown CometChat error.';
  const code = e.code || e.errorCode;
  const message = e.message || e.errorDescription;
  if (code && message) return `[CometChat ${code}] ${message}`;
  if (message) return `[CometChat] ${message}`;
  try {
    return `[CometChat] ${JSON.stringify(e)}`;
  } catch {
    return `[CometChat] ${String(e)}`;
  }
}

/**
 * CometChatProvider for React Native (Expo).
 *
 * Handles chat SDK init + login. If the native module isn't available
 * (e.g. running in Expo Go without a dev build), it skips gracefully
 * and the app still renders — just without chat features.
 */
export function CometChatProvider({ children }) {
  const { token, user } = useContext(AuthContext);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [cometChatUid, setCometChatUid] = useState(null);

  useEffect(() => {
    // Reset ready states on auth/user changes to force unmount and prevent stale sessions
    setIsReady(false);
    setCometChatUid(null);

    // If SDK not available, skip entirely
    if (!CometChatUIKit) {
      console.warn('[CometChat] SDK not available. Chat features disabled.');
      return;
    }

    if (!token || !user) {
      // Auto-logout from CometChat reactively
      if (initialized) {
        try {
          CometChatUIKit.logout().catch(e => console.warn('[CometChat] Logout error:', e));
        } catch {
          if (CometChat) CometChat.logout().catch(e => console.warn('[CometChat] Logout error:', e));
        }
        initialized = false;
        loginInFlight = null;
      }
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        // 1. Fetch config from backend
        const configRes = await fetch(`${API_BASE_URL}/api/cometchat/config`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!configRes.ok) {
          console.warn('[CometChat] Failed to fetch config:', configRes.status);
          return;
        }
        const { appId, region } = await configRes.json();

        if (!appId || !region) {
          console.warn('[CometChat] appId/region not configured. Skipping.');
          return;
        }

        // 2. Initialize UIKit (once)
        if (!initialized) {
          await CometChatUIKit.init({
            appId,
            region,
            subscriptionType: 'ALL_USERS',
          });

          // Initialize Calls SDK (flat object, NO CallAppSettingsBuilder in RN v5)
          // In additive mode, NO separate CometChatCalls.login — UIKit handles internally
          if (CometChatCalls) {
            try {
              await CometChatCalls.init({ appId, region });
              console.log('[CometChat] Calls SDK initialized successfully');
            } catch (callsErr) {
              console.warn('[CometChat] Calls SDK init failed (calls disabled):', callsErr);
              // Don't block chat — calls are optional
            }
          }

          initialized = true;
        }

        if (cancelled) return;

        // 3. Sync user with backend
        const syncRes = await fetch(`${API_BASE_URL}/api/cometchat/sync`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!syncRes.ok) {
          const err = await syncRes.json().catch(() => ({}));
          throw new Error(err.error || `Sync failed: ${syncRes.status}`);
        }

        const { cometChatUid: uid, authToken } = await syncRes.json();

        if (cancelled) return;

        // 4. Login with auth token
        let existing = null;
        try {
          if (CometChat) {
            existing = await CometChat.getLoggedinUser();
          } else {
            existing = await CometChatUIKit.getLoggedInUser();
          }
        } catch (e) {
          if (e?.code !== 'NOT_FOUND' && e?.errorCode !== 'NOT_FOUND') {
            throw e;
          }
        }

        if (existing && existing.getUid() !== uid) {
          console.log(`[CometChat] Logged in user mismatch (${existing.getUid()} vs ${uid}). Logging out...`);
          try {
            await CometChatUIKit.logout();
          } catch {
            if (CometChat) await CometChat.logout();
          }
          existing = null;
        }

        if (!existing) {
          if (loginInFlight) {
            await loginInFlight;
          } else {
            loginInFlight = CometChatUIKit.login({ authToken });
            try {
              await loginInFlight;
            } finally {
              loginInFlight = null;
            }
          }
        }

        if (cancelled) return;

        setCometChatUid(uid);
        setIsReady(true);
      } catch (e) {
        if (cancelled) return;
        console.error('[CometChat]', formatError(e));
        setError(formatError(e));
      }
    }

    setup();

    return () => {
      cancelled = true;
    };
  }, [token, user]);

  return (
    <CometChatContext.Provider value={{ isReady, error, cometChatUid }}>
      {children}
    </CometChatContext.Provider>
  );
}

/**
 * Logout from CometChat. Call this when the user logs out of the app.
 */
export async function logoutCometChat() {
  try {
    if (CometChatUIKit) {
      await CometChatUIKit.logout();
    }
  } catch (e) {
    console.warn('[CometChat] Logout error:', e);
  }
  initialized = false;
  loginInFlight = null;
}

export default CometChatProvider;
