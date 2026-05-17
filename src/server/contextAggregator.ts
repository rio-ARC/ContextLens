/**
 * ContextLens — Context Aggregator
 *
 * CRITICAL RULES (from spec):
 * - ALL API calls MUST be in a single Promise.allSettled([...]) — never sequential awaits
 * - If any individual call fails: mark that signal unavailable, continue with the rest
 * - Never throw — always return a ContextPayload, even a partial one
 */

import { reddit } from '@devvit/web/server';
import { parseToolboxNotes } from './toolboxParser.js';
import type {
  ContextPayload,
  ModerationEvent,
  ModNote,
} from '../shared/types.js';

const INDIVIDUAL_TIMEOUT_MS = 24_000;

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ]);
}

// ---------------------------------------------------------------------------
// Posting burst detection — >10 actions in any rolling 24-hour window
// ---------------------------------------------------------------------------

function detectPostingBurst(commentTs: number[], postTs: number[]): boolean {
  const all = [...commentTs, ...postTs].sort((a, b) => a - b);
  if (all.length < 11) return false;

  const DAY_MS = 24 * 60 * 60 * 1000;
  for (let i = 0; i < all.length; i++) {
    const windowEnd = all[i] + DAY_MS;
    let count = 1;
    for (let j = i + 1; j < all.length && all[j] <= windowEnd; j++) {
      count++;
      if (count > 10) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Confidence level
// ---------------------------------------------------------------------------

function computeConfidence(
  isPrivate: boolean,
  totalDataPoints: number,
  anyCallFailed: boolean
): ContextPayload['confidenceLevel'] {
  if (isPrivate || totalDataPoints < 5) return 'limited';
  if (anyCallFailed) return 'moderate';
  return 'high';
}

// ---------------------------------------------------------------------------
// Main aggregator
// ---------------------------------------------------------------------------

export async function aggregateContext(
  subredditName: string,
  username: string,
): Promise<ContextPayload> {
  // ── Fire all 6 calls simultaneously ────────────────────────────────────
  const [
    commentsResult,
    postsResult,
    modLogResult,
    modNotesResult,
    userResult,
    toolboxResult,
  ] = await Promise.allSettled([
    // 1. Recent comments
    withTimeout(
      reddit.getCommentsByUser({ username, timeframe: 'month', sort: 'new', limit: 100 }).all(),
      INDIVIDUAL_TIMEOUT_MS
    ),
    // 2. Recent posts
    withTimeout(
      reddit.getPostsByUser({ username, timeframe: 'month', sort: 'new', limit: 50 }).all(),
      INDIVIDUAL_TIMEOUT_MS
    ),
    // 3. Mod log for the subreddit (filter to user client-side)
    withTimeout(
      reddit.getModerationLog({ subredditName, limit: 100 }).all(),
      INDIVIDUAL_TIMEOUT_MS
    ),
    // 4. Mod notes for this user (API uses 'subreddit' not 'subredditName')
    withTimeout(
      reddit.getModNotes({ subreddit: subredditName, user: username }).all(),
      INDIVIDUAL_TIMEOUT_MS
    ),
    // 5. User profile
    withTimeout(
      reddit.getUserByUsername(username),
      INDIVIDUAL_TIMEOUT_MS
    ),
    // 6. Toolbox usernotes (best-effort; errors caught inside parseToolboxNotes)
    withTimeout(
      reddit.getWikiPage(subredditName, 'usernotes').then(
        (wp) => parseToolboxNotes(wp.content, username)
      ),
      INDIVIDUAL_TIMEOUT_MS
    ),
  ]);

  // ── Extract results ──────────────────────────────────────────────────────

  const comments    = commentsResult.status === 'fulfilled' ? commentsResult.value : null;
  const posts       = postsResult.status === 'fulfilled' ? postsResult.value : null;
  const fullModLog  = modLogResult.status === 'fulfilled' ? modLogResult.value : null;
  const rawModNotes = modNotesResult.status === 'fulfilled' ? modNotesResult.value : null;
  const user        = userResult.status === 'fulfilled' ? userResult.value : null;
  const tbNotes     = toolboxResult.status === 'fulfilled' ? toolboxResult.value : [];

  const anyCallFailed =
    commentsResult.status === 'rejected' ||
    postsResult.status === 'rejected' ||
    modLogResult.status === 'rejected' ||
    modNotesResult.status === 'rejected' ||
    userResult.status === 'rejected';

  // ── Process mod log ──────────────────────────────────────────────────────
  // ModAction fields: type (ModActionType), moderatorName, createdAt (Date), target.author (string)

  const usernameLower = username.toLowerCase();

  const subredditRemovals: ModerationEvent[] = (fullModLog ?? [])
    .filter(
      (entry) =>
        (entry.target?.author?.toLowerCase() === usernameLower) &&
        (entry.type === 'removelink' || entry.type === 'removecomment')
    )
    .map((entry): ModerationEvent => ({
      action: entry.type,
      moderator: entry.moderatorName,
      timestamp: entry.createdAt.getTime(),
      targetType: entry.type === 'removelink' ? 'post' : 'comment',
      details: entry.details ?? undefined,
    }));

  // Reports: count 'ignorereports' actions as proxy — Reddit doesn't expose raw report counts
  // We count entries where the target is this user AND action is ban-adjacent or 'snoozereports'
  // A simpler, reliable approach: count spamlink/spamcomment actions targeting the user
  const subredditReports = (fullModLog ?? []).filter(
    (entry) =>
      entry.target?.author?.toLowerCase() === usernameLower &&
      (entry.type === 'spamlink' || entry.type === 'spamcomment')
  ).length;

  // ── Process mod notes ────────────────────────────────────────────────────
  // ModNote.userNote?.note, ModNote.userNote?.label, ModNote.operator.name, ModNote.createdAt

  const modNotes: ModNote[] = (rawModNotes ?? [])
    .filter((n) => n.userNote?.note)
    .map((n): ModNote => ({
      text: n.userNote?.note ?? '',
      label: n.userNote?.label ?? '',
      createdAt: n.createdAt.getTime(),
      moderator: n.operator?.name ?? 'unknown',
    }));

  // ── Process user ─────────────────────────────────────────────────────────

  const now = Date.now();
  const createdAt = user?.createdAt ? new Date(user.createdAt).getTime() : now;
  const accountAgeDays = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));
  const totalKarma = (user?.commentKarma ?? 0) + (user?.linkKarma ?? 0);

  // Private profile heuristic: no user object, or no public activity at all
  const isPrivateProfile =
    !user ||
    (totalKarma === 0 &&
      (comments?.length ?? 0) === 0 &&
      (posts?.length ?? 0) === 0);

  // ── Timestamps for burst detection ───────────────────────────────────────

  const commentTimestamps = (comments ?? []).map((c) =>
    c.createdAt ? new Date(c.createdAt).getTime() : 0
  );
  const postTimestamps = (posts ?? []).map((p) =>
    p.createdAt ? new Date(p.createdAt).getTime() : 0
  );
  const postingBurst = detectPostingBurst(commentTimestamps, postTimestamps);

  // ── Aggregate counts ─────────────────────────────────────────────────────

  const recentCommentCount = comments?.length ?? 0;
  const recentPostCount = posts?.length ?? 0;
  const toolboxNotes = tbNotes ?? [];

  const totalDataPoints =
    recentCommentCount + recentPostCount + subredditRemovals.length + modNotes.length;

  const confidenceLevel = computeConfidence(isPrivateProfile, totalDataPoints, anyCallFailed);

  return {
    username,
    accountAgeDays,
    totalKarma,
    recentCommentCount,
    recentPostCount,
    subredditRemovals,
    subredditReports,
    modNotes,
    toolboxNotes,
    postingBurst,
    isPrivateProfile,
    confidenceLevel,
    dataPartial: anyCallFailed,
    fetchedAt: now,
  };
}
