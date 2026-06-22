/**
 * Formats a CometChat error into a readable string.
 * CometChatException objects are { code, message } or { errorCode, errorDescription }.
 * String(e) on them yields "[object Object]" — this helper extracts the actual message.
 */
export function formatCometChatError(e) {
  if (e == null) return 'Unknown CometChat error.';
  const err = e;
  const code = err.code || err.errorCode;
  const message = err.message || err.errorDescription;
  if (code && message) return `[CometChat ${code}] ${message}`;
  if (message) return `[CometChat] ${message}`;
  try {
    return `[CometChat] ${JSON.stringify(e)}`;
  } catch {
    return `[CometChat] ${String(e)}`;
  }
}

export function logCometChatError(e) {
  const formatted = formatCometChatError(e);
  console.error(formatted, e);
}
