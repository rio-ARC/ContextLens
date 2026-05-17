/**
 * ContextLens — Shared TypeScript interfaces
 * All types used by both server and client live here.
 * Server imports via relative path; client via @shared alias.
 */

// ---------------------------------------------------------------------------
// Core data model
// ---------------------------------------------------------------------------

export interface ModerationEvent {
  action: string;
  moderator: string;
  timestamp: number;      // unix ms
  targetType: 'post' | 'comment';
  details?: string;
}

export interface ModNote {
  text: string;
  label: string;          // e.g. 'SPAM', 'ABUSE', 'BOT', 'WARNING', 'WATCH', etc.
  createdAt: number;      // unix ms
  moderator: string;
}

export interface ToolboxNote {
  text: string;
  type: string;           // Toolbox note type key (e.g. 'spammer', 'abusive')
  timestamp: number;      // unix ms
}

export interface ContextPayload {
  username: string;
  accountAgeDays: number;
  totalKarma: number;
  recentCommentCount: number;      // last 30 days
  recentPostCount: number;         // last 30 days
  subredditRemovals: ModerationEvent[];
  subredditReports: number;
  modNotes: ModNote[];
  toolboxNotes: ToolboxNote[];
  postingBurst: boolean;           // true if >10 actions in any 24h window
  isPrivateProfile: boolean;
  confidenceLevel: 'high' | 'moderate' | 'limited';
  dataPartial: boolean;            // true if any fetch timed out
  fetchedAt: number;               // unix ms timestamp (for display purposes)
}

// ---------------------------------------------------------------------------
// Scored signals
// ---------------------------------------------------------------------------

export type SignalSeverity = 'clean' | 'watch' | 'concern';

export interface ScoredSignal {
  id: string;
  label: string;
  value: string;
  severity: SignalSeverity;
  icon: string;                    // Tabler icon name e.g. 'ti-calendar'
}

// ---------------------------------------------------------------------------
// Narrative summary
// ---------------------------------------------------------------------------

export interface NarrativeSummary {
  text: string;                    // 2–3 plain-English sentences
  primarySignal: string;           // the dominant signal driving the summary
}

// ---------------------------------------------------------------------------
// Cache (server-side only, but kept here for shared awareness)
// ---------------------------------------------------------------------------

export interface CacheEntry {
  payload: ContextPayload;
  fetchedAt: number;               // kept for backwards compat; TTL is managed by Redis
}

// ---------------------------------------------------------------------------
// Client ↔ Server message types (for the WebView /api/ fetch calls)
// ---------------------------------------------------------------------------

export interface ContextResponse {
  payload: ContextPayload;
  signals: ScoredSignal[];
  summary: NarrativeSummary;
}

export interface AddModNoteRequest {
  subredditName: string;
  username: string;
  note: string;
  label?: string;
}

export interface RemoveContentRequest {
  subredditName: string;
  contentId: string;               // t3_ or t1_ prefixed id
  contentType: 'post' | 'comment';
  isSpam?: boolean;
}

export interface BanUserRequest {
  subredditName: string;
  username: string;
  reason: string;
  duration?: number;               // days; omit for permanent
  modNote?: string;
}

export interface ApiSuccessResponse {
  success: true;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Devvit form / menu context types (server-side use)
// ---------------------------------------------------------------------------

export interface MenuItemContext {
  postId?: string;
  commentId?: string;
  subredditName: string;
  username: string;                // author of the post or comment
}

// ---------------------------------------------------------------------------
// Devvit Web server response types (used in Hono handlers)
// ---------------------------------------------------------------------------

export interface UiFormField {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'select';
  label: string;
  defaultValue?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface UiForm {
  title: string;
  acceptLabel?: string;
  cancelLabel?: string;
  fields: UiFormField[];
}

export interface UiResponse {
  showToast?: string;
  showForm?: {
    name: string;
    form: UiForm;
  };
}

export interface MenuItemRequest {
  postId?: string;
  commentId?: string;
}
