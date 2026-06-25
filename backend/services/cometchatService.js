import dotenv from 'dotenv';

dotenv.config();

const APP_ID = process.env.COMETCHAT_APP_ID;
const REGION = process.env.COMETCHAT_REGION;
const AUTH_KEY = process.env.COMETCHAT_AUTH_KEY;
const REST_API_KEY = process.env.COMETCHAT_REST_API_KEY;

if (!APP_ID || !REGION) {
  console.warn('[CometChat] COMETCHAT_APP_ID or COMETCHAT_REGION not set. CometChat features will be disabled.');
}

const BASE_URL = `https://${APP_ID}.api-${REGION}.cometchat.io/v3`;

/**
 * Internal fetch wrapper for CometChat REST API calls.
 * Handles headers, error parsing, and rate-limit retries.
 */
async function cometchatFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    appid: APP_ID,
    apikey: REST_API_KEY,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  // Handle rate limiting with retry
  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
    console.warn(`[CometChat] Rate limited. Retrying after ${retryAfter}s...`);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return cometchatFetch(path, options);
  }

  return response;
}

// ─── UID STRATEGY ──────────────────────────────────────────────────────────────

/**
 * Derives a deterministic CometChat UID from the app's User.id.
 * Format: medicare_user_{uuid}
 */
export function deriveCometChatUid(userId) {
  return `medicare_user_${userId}`;
}

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────────

/**
 * Creates a CometChat user with role and tags.
 * Returns the created user object or null if already exists (409).
 */
export async function createCometChatUser(uid, name, role, tags = []) {
  if (!APP_ID || !REST_API_KEY) return null;

  const body = {
    uid,
    name,
    role: role.toLowerCase(),
    tags,
  };

  const response = await cometchatFetch('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data;
  }

  const errorData = await response.json().catch(() => ({}));
  if (response.status === 409 || errorData?.error?.code === 'ERR_UID_ALREADY_EXISTS') {
    // User already exists — update instead
    console.log(`[CometChat] User ${uid} already exists. Updating...`);
    return updateCometChatUser(uid, { name, role: role.toLowerCase(), tags });
  }

  console.error(`[CometChat] Failed to create user ${uid}:`, errorData);
  return null;
}

/**
 * Updates an existing CometChat user (name, avatar, role, tags, metadata).
 */
export async function updateCometChatUser(uid, updates) {
  if (!APP_ID || !REST_API_KEY) return null;

  const body = {};
  if (updates.name) body.name = updates.name;
  if (updates.avatar) body.avatar = updates.avatar;
  if (updates.role) body.role = updates.role.toLowerCase();
  if (updates.tags) body.tags = updates.tags;
  if (updates.metadata) body.metadata = updates.metadata;

  const response = await cometchatFetch(`/users/${encodeURIComponent(uid)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data;
  }

  const error = await response.json().catch(() => ({}));
  console.error(`[CometChat] Failed to update user ${uid}:`, error);
  return null;
}

/**
 * Deactivates a CometChat user (soft delete).
 */
export async function deactivateCometChatUser(uid) {
  if (!APP_ID || !REST_API_KEY) return false;

  const response = await cometchatFetch(`/users/${encodeURIComponent(uid)}`, {
    method: 'DELETE',
    body: JSON.stringify({ permanent: false }),
  });

  if (response.ok) {
    return true;
  }

  const error = await response.json().catch(() => ({}));
  console.error(`[CometChat] Failed to deactivate user ${uid}:`, error);
  return false;
}

// ─── AUTH TOKEN GENERATION ─────────────────────────────────────────────────────

/**
 * Generates a CometChat auth token for a user (server-minted).
 * The client uses this token with loginWithAuthToken().
 */
export async function generateAuthToken(uid) {
  if (!APP_ID || !REST_API_KEY) return null;

  const response = await cometchatFetch(`/users/${encodeURIComponent(uid)}/auth_tokens`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data.authToken;
  }

  const error = await response.json().catch(() => ({}));
  console.error(`[CometChat] Failed to generate auth token for ${uid}:`, error);
  return null;
}

// ─── TAG MANAGEMENT ────────────────────────────────────────────────────────────

/**
 * Builds the tag array for a user based on their app role and doctor profile.
 */
export function buildUserTags(role, specialization = null, isAgent = false) {
  const tags = [`role:${role.toLowerCase()}`, 'verified'];

  if (role === 'DOCTOR' && specialization) {
    // Normalize specialization to tag format: "Cardiology" → "dept:cardiology"
    const dept = specialization.toLowerCase().replace(/\s+/g, '-');
    tags.push(`dept:${dept}`);
  }

  if (role === 'STAFF' && isAgent) {
    tags.push('role:agent');
  }

  return tags;
}

// ─── FULL SYNC WORKFLOW ────────────────────────────────────────────────────────

/**
 * Syncs a local user to CometChat:
 * 1. Creates or updates the CometChat user with role + tags
 * 2. Generates an auth token for the client SDK
 * 3. Returns { uid, authToken } or null on failure
 *
 * @param {object} user - The app User model instance
 * @param {string|null} specialization - Doctor specialization (if DOCTOR role)
 * @param {boolean} isAgent - Whether this Staff user is an agent
 */
export async function syncUserToCometChat(user, specialization = null, isAgent = false) {
  if (!APP_ID || !REST_API_KEY) {
    console.warn('[CometChat] Service not configured. Skipping sync.');
    return null;
  }

  const uid = deriveCometChatUid(user.id);
  const tags = buildUserTags(user.role, specialization, isAgent);

  // Strip "Dr." prefix for doctor names so CometChat renders clean initials (e.g. "RC" not "DR")
  let displayName = user.name;
  if (user.role === 'DOCTOR' && /^dr\.\s+/i.test(displayName)) {
    displayName = displayName.replace(/^dr\.\s+/i, '').trim();
  }

  // Create or update the user in CometChat
  const ccUser = await createCometChatUser(uid, displayName, user.role, tags);
  if (!ccUser) {
    console.error(`[CometChat] syncUserToCometChat failed for ${uid}`);
    return null;
  }

  // Generate auth token for client SDK
  const authToken = await generateAuthToken(uid);
  if (!authToken) {
    console.error(`[CometChat] Could not generate auth token for ${uid}`);
    return null;
  }

  return { uid, authToken };
}

// ─── ROLE MANAGEMENT ───────────────────────────────────────────────────────────

/**
 * Creates a CometChat role if it doesn't exist.
 * Called during app initialization to ensure all roles are set up.
 */
export async function ensureRoleExists(roleName, description = '') {
  if (!APP_ID || !REST_API_KEY) return;

  const response = await cometchatFetch(`/roles/${encodeURIComponent(roleName)}`, {
    method: 'GET',
  });

  if (response.ok) return; // Role already exists

  // Create the role
  const createResponse = await cometchatFetch('/roles', {
    method: 'POST',
    body: JSON.stringify({
      role: roleName,
      name: description || `Medicare ${roleName}`,
      description: description || `Medicare ${roleName} role`,
    }),
  });

  if (createResponse.ok) {
    console.log(`[CometChat] Created role: ${roleName}`);
  } else {
    const error = await createResponse.json().catch(() => ({}));
    // 409 = already exists, which is fine
    if (createResponse.status !== 409) {
      console.error(`[CometChat] Failed to create role ${roleName}:`, error);
    }
  }
}

/**
 * Ensures all Medicare roles exist in CometChat.
 * Call once during server startup.
 */
export async function initializeCometChatRoles() {
  if (!APP_ID || !REST_API_KEY) {
    console.warn('[CometChat] Not configured. Skipping role initialization.');
    return;
  }

  console.log('[CometChat] Initializing roles...');
  await ensureRoleExists('patient', 'Medicare patient — can message connected doctors');
  await ensureRoleExists('doctor', 'Medicare doctor — can message patients and peers, initiate calls');
  await ensureRoleExists('staff', 'Medicare staff — presence only, no messaging');
  await ensureRoleExists('admin', 'Medicare admin — full access for moderation');
  console.log('[CometChat] Roles initialized.');

  console.log('[CometChat] Registering AI Assistant user...');
  await createCometChatUser(
    'medicare_ai_assistant',
    'MediCare AI Assistant',
    'admin',
    ['role:bot', 'verified']
  );
}

/**
 * Sends a message on behalf of a user using CometChat REST API.
 */
export async function sendCometChatMessage(senderUid, receiverUid, text, metadata = null) {
  if (!APP_ID || !REST_API_KEY) {
    console.warn('[CometChat] Service not configured. Skipping message send.');
    return null;
  }

  const body = {
    receiver: receiverUid,
    receiverType: 'user',
    category: 'message',
    type: 'text',
    data: {
      text: text,
      ...(metadata && { metadata })
    },
    sender: senderUid
  };

  const response = await cometchatFetch('/messages', {
    method: 'POST',
    headers: {
      onBehalfOf: senderUid
    },
    body: JSON.stringify(body),
  });

  if (response.ok) {
    const data = await response.json();
    return data.data;
  }

  const error = await response.json().catch(() => ({}));
  console.error(`[CometChat] Failed to send message from ${senderUid} to ${receiverUid}:`, error);
  return null;
}

