/**
 * ContextLens — Toolbox Usernotes Parser
 *
 * Toolbox stores usernotes in the subreddit wiki page "usernotes".
 * The notes blob (key "blob") is: base64 → zlib.inflateRaw() → JSON.parse()
 *
 * Pipeline (Correction 2):
 *   base64 decode → zlib.inflateRaw() → JSON.parse()
 *
 * Entire pipeline is wrapped in try/catch — returns [] on any failure.
 * This is a best-effort feature; app works fully without it.
 *
 * Toolbox usernotes JSON format (after decompression):
 * {
 *   [username]: [
 *     { n: "note text", t: timestamp_seconds, m: "moderator", l: "noteType" }
 *   ]
 * }
 */

import { inflateRaw } from 'zlib';
import { promisify } from 'util';
import type { ToolboxNote } from '../shared/types.js';

const inflateRawAsync = promisify(inflateRaw);

/** Raw shape of a single Toolbox note entry after decompression */
interface RawToolboxNote {
  n: string;   // note text
  t: number;   // timestamp in seconds
  m: string;   // moderator username
  l: string;   // note type/label key
}

/** Raw shape of the decompressed Toolbox usernotes blob */
interface ToolboxNotesBlob {
  [username: string]: RawToolboxNote[];
}

/**
 * Parse a Toolbox wiki page content string and extract notes for a specific user.
 * Returns an empty array on any parse/decompress failure.
 *
 * @param wikiContent  Raw content string from the "usernotes" wiki page
 * @param username     Username to look up (case-insensitive)
 */
export async function parseToolboxNotes(
  wikiContent: string,
  username: string
): Promise<ToolboxNote[]> {
  try {
    // The wiki page is JSON with a "blob" key containing the compressed notes
    const wikiJson = JSON.parse(wikiContent) as { blob?: string };
    if (!wikiJson.blob) return [];

    // Step 1: base64 decode
    const compressed = Buffer.from(wikiJson.blob, 'base64');

    // Step 2: zlib inflateRaw
    const decompressed = await inflateRawAsync(compressed);

    // Step 3: JSON.parse the decompressed string
    const blob = JSON.parse(decompressed.toString('utf8')) as ToolboxNotesBlob;

    // Look up the user — Toolbox stores usernames case-sensitively but we check both
    const userKey = Object.keys(blob).find(
      (k) => k.toLowerCase() === username.toLowerCase()
    );
    if (!userKey) return [];

    const rawNotes = blob[userKey];
    if (!Array.isArray(rawNotes)) return [];

    return rawNotes.map((raw): ToolboxNote => ({
      text: raw.n ?? '',
      type: raw.l ?? 'none',
      timestamp: (raw.t ?? 0) * 1000,  // Toolbox timestamps are in seconds; convert to ms
    }));
  } catch {
    // Any failure — decompress error, JSON error, etc. — return empty
    return [];
  }
}
