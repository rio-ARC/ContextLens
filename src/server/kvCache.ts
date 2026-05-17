/**
 * ContextLens — KV Cache Layer
 *
 * Devvit's Redis SetOptions uses { expiration: Date } (not { ex: N }).
 * We set expiration to 5 minutes from now on every write.
 * When a key has expired, redis.get() returns undefined — no manual check needed.
 *
 * Key pattern: contextlens:{subredditName}:{username}
 */

import { redis } from '@devvit/web/server';
import type { ContextPayload } from '../shared/types.js';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Build the canonical cache key for a user in a subreddit.
 * Lowercase both parts to avoid case-sensitivity issues.
 */
function cacheKey(subredditName: string, username: string): string {
  return `contextlens:${subredditName.toLowerCase()}:${username.toLowerCase()}`;
}

/**
 * Retrieve a cached ContextPayload.
 * Returns null if the key doesn't exist or has expired (Redis handles expiry natively).
 */
export async function getCached(
  subredditName: string,
  username: string
): Promise<ContextPayload | null> {
  const raw = await redis.get(cacheKey(subredditName, username));
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as ContextPayload;
  } catch {
    // Corrupt cache entry — treat as miss
    return null;
  }
}

/**
 * Store a ContextPayload with a 5-minute expiration.
 * Uses SetOptions.expiration (the Devvit Redis API's way to set TTL).
 */
export async function setCached(
  subredditName: string,
  username: string,
  payload: ContextPayload
): Promise<void> {
  await redis.set(
    cacheKey(subredditName, username),
    JSON.stringify(payload),
    { expiration: new Date(Date.now() + CACHE_TTL_MS) }
  );
}

/**
 * Check onboarding state — returns true if this installation has completed onboarding.
 */
export async function isOnboarded(): Promise<boolean> {
  const val = await redis.get('contextlens:onboarded');
  return val === 'true';
}

/**
 * Mark this installation as onboarded (persists indefinitely).
 */
export async function markOnboarded(): Promise<void> {
  await redis.set('contextlens:onboarded', 'true');
}
