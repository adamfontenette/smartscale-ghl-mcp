/**
 * Firebase Auth Helper
 *
 * Refreshes a Firebase ID token using the long-lived refresh token,
 * with TTL caching so we only hit Google's securetoken endpoint once
 * every ~50 minutes (Firebase ID tokens are valid for 60 minutes).
 *
 * Used by GHL internal-API tools (workflow builder, etc.) that need a
 * fresh `token-id` header to call backend.leadconnectorhq.com endpoints.
 *
 * Env vars required (set on Railway -> service -> Variables):
 *   - GHL_FIREBASE_API_KEY        (Web API key from Firebase project)
 *   - GHL_FIREBASE_REFRESH_TOKEN  (long-lived refresh token captured from a logged-in GHL session)
 *
 * NOTE: WorkflowBuilderClient also has its own internal refresh logic.
 * This module is a standalone reusable equivalent, exposed for any new
 * tool that doesn't go through WorkflowBuilderClient.
 */

const FIREBASE_TOKEN_URL = 'https://securetoken.googleapis.com/v1/token';

// Refresh after 50 min — ID tokens last 60 min, so this gives us buffer.
const TOKEN_TTL_MS = 50 * 60 * 1000;

interface FirebaseTokenResponse {
  access_token?: string;
  expires_in?: string;
  token_type?: string;
  refresh_token?: string;
  id_token?: string;
  user_id?: string;
  project_id?: string;
  error?: { message: string; code?: number };
}

export interface FirebaseRefreshedToken {
  idToken: string;
  refreshToken: string;
  /** Seconds until expiry as reported by Google (typically 3600). */
  expiresIn: number;
  /** Absolute ms-epoch when the cached token will be considered stale. */
  expiresAt: number;
}

interface CacheEntry {
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

// In-memory cache keyed by (apiKey, currentRefreshToken). Lets us share
// across calls in the same process without thrashing the Firebase API.
const cache = new Map<string, CacheEntry>();

function cacheKey(apiKey: string, refreshToken: string): string {
  return `${apiKey}::${refreshToken.slice(0, 32)}`;
}

/**
 * Refresh a Firebase ID token. Reads GHL_FIREBASE_API_KEY and
 * GHL_FIREBASE_REFRESH_TOKEN from env unless explicit args are provided.
 *
 * Cached for 50 min based on (apiKey, refreshToken). Pass `force: true`
 * to bypass the cache.
 *
 * Throws a descriptive error if env vars are missing or the Firebase
 * call fails.
 */
export async function refreshFirebaseIdToken(opts?: {
  apiKey?: string;
  refreshToken?: string;
  force?: boolean;
}): Promise<FirebaseRefreshedToken> {
  const apiKey = opts?.apiKey || process.env.GHL_FIREBASE_API_KEY || '';
  const refreshToken = opts?.refreshToken || process.env.GHL_FIREBASE_REFRESH_TOKEN || '';

  if (!apiKey || !refreshToken) {
    const missing = [
      !apiKey && 'GHL_FIREBASE_API_KEY',
      !refreshToken && 'GHL_FIREBASE_REFRESH_TOKEN',
    ].filter(Boolean).join(', ');
    throw new Error(
      `Firebase auth not configured. Missing env var(s): ${missing}. ` +
      `Set them on Railway: dashboard -> service -> Variables. ` +
      `See docs/firebase-auth-setup.md for capture instructions.`
    );
  }

  const key = cacheKey(apiKey, refreshToken);

  if (!opts?.force) {
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return {
        idToken: cached.idToken,
        refreshToken: cached.refreshToken,
        expiresIn: cached.expiresIn,
        expiresAt: cached.expiresAt,
      };
    }
  }

  const url = `${FIREBASE_TOKEN_URL}?key=${encodeURIComponent(apiKey)}`;
  const body = `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  let data: FirebaseTokenResponse;
  try {
    data = await res.json() as FirebaseTokenResponse;
  } catch (err) {
    throw new Error(
      `Firebase token refresh failed (${res.status}): could not parse response body. ` +
      `${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok || !data.id_token) {
    const msg = data.error?.message || JSON.stringify(data);
    throw new Error(
      `Firebase token refresh failed (${res.status}): ${msg}. ` +
      `If error is INVALID_REFRESH_TOKEN, re-capture GHL_FIREBASE_REFRESH_TOKEN ` +
      `from a logged-in GHL session and update the Railway env var.`
    );
  }

  const expiresIn = parseInt(data.expires_in || '3600', 10);
  // Honor Google's expires_in if smaller than our TTL; otherwise use our 50-min cap.
  const ttl = Math.min(TOKEN_TTL_MS, Math.max(0, (expiresIn - 300) * 1000));
  const newRefresh = data.refresh_token || refreshToken;

  const entry: CacheEntry = {
    idToken: data.id_token,
    refreshToken: newRefresh,
    expiresIn,
    expiresAt: Date.now() + ttl,
  };

  cache.set(key, entry);

  // If Google rotated the refresh token, also cache under the new key
  // so subsequent calls with the new token hit the cache.
  if (newRefresh !== refreshToken) {
    cache.set(cacheKey(apiKey, newRefresh), entry);
  }

  return {
    idToken: entry.idToken,
    refreshToken: entry.refreshToken,
    expiresIn: entry.expiresIn,
    expiresAt: entry.expiresAt,
  };
}

/**
 * Clear the in-memory cache (e.g. after a 401 from the upstream API,
 * to force re-fetch on the next call).
 */
export function clearFirebaseTokenCache(): void {
  cache.clear();
}
