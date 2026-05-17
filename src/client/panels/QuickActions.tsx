import type { ContextPayload, NarrativeSummary } from '../../shared/types';

interface QuickActionsProps {
  payload: ContextPayload;
  summary: NarrativeSummary;
  onAddNote: (prefillText: string) => void;
  onRemove: () => void;
  onBan: () => void;
  onDismiss: () => void;
}

export default function QuickActions({
  payload,
  summary,
  onAddNote,
  onRemove,
  onBan,
  onDismiss,
}: QuickActionsProps) {
  // Pre-fill mod note with truncated narrative
  const notePrefill = summary.text.length > 100
    ? summary.text.slice(0, 97) + '…'
    : summary.text;

  return (
    <div className="quick-actions" role="toolbar" aria-label="Quick moderation actions">
      <button
        id="action-add-note"
        className="action-btn"
        onClick={() => onAddNote(notePrefill)}
        title={`Add a mod note about ${payload.username}`}
      >
        📝 Note
      </button>

      <button
        id="action-remove"
        className="action-btn danger"
        onClick={onRemove}
        title="Remove this post or comment"
      >
        ✕ Remove
      </button>

      <button
        id="action-ban"
        className="action-btn danger"
        onClick={onBan}
        title={`Ban ${payload.username} from this subreddit`}
      >
        🚫 Ban
      </button>

      <button
        id="action-dismiss"
        className="action-btn"
        onClick={onDismiss}
        title="Close this panel"
      >
        ✓ Done
      </button>
    </div>
  );
}
