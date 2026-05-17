import type { ContextPayload } from '../../shared/types';

interface HistoryTabProps {
  payload: ContextPayload;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    removelink: 'Post removed',
    removecomment: 'Comment removed',
    banuser: 'User banned',
    addnote: 'Mod note added',
    spamlink: 'Post marked spam',
    spamcomment: 'Comment marked spam',
  };
  return map[action] ?? action.replace(/([a-z])([A-Z])/g, '$1 $2');
}

type HistoryEntry =
  | { kind: 'removal'; action: string; moderator: string; timestamp: number; details?: string }
  | { kind: 'modnote'; text: string; label: string; moderator: string; createdAt: number };

export default function HistoryTab({ payload }: HistoryTabProps) {
  // Merge removals and mod notes into a single sorted list
  const entries: HistoryEntry[] = [
    ...payload.subredditRemovals.map((r): HistoryEntry => ({
      kind: 'removal',
      action: r.action,
      moderator: r.moderator,
      timestamp: r.timestamp,
      details: r.details,
    })),
    ...payload.modNotes.map((n): HistoryEntry => ({
      kind: 'modnote',
      text: n.text,
      label: n.label,
      moderator: n.moderator,
      createdAt: n.createdAt,
    })),
  ].sort((a, b) => {
    const ta = a.kind === 'removal' ? a.timestamp : a.createdAt;
    const tb = b.kind === 'removal' ? b.timestamp : b.createdAt;
    return tb - ta; // newest first
  });

  if (entries.length === 0) {
    return (
      <div className="empty-history">
        <p>No moderation history in this subreddit.</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      {entries.map((entry, i) => {
        if (entry.kind === 'removal') {
          return (
            <div key={i} className="history-item">
              <span className="history-item__action">{actionLabel(entry.action)}</span>
              <span className="history-item__meta">
                by {entry.moderator} · {formatDate(entry.timestamp)}
              </span>
              {entry.details && (
                <span className="history-item__note">{entry.details}</span>
              )}
            </div>
          );
        } else {
          return (
            <div key={i} className="history-item">
              <span className="history-item__action">
                Mod note{entry.label ? ` — ${entry.label}` : ''}
              </span>
              <span className="history-item__meta">
                by {entry.moderator} · {formatDate(entry.createdAt)}
              </span>
              {entry.text && (
                <span className="history-item__note">"{entry.text}"</span>
              )}
            </div>
          );
        }
      })}

      {payload.toolboxNotes.length > 0 && (
        <>
          <div style={{ padding: '4px 0', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Toolbox Notes
          </div>
          {payload.toolboxNotes.map((tn, i) => (
            <div key={`tb-${i}`} className="history-item">
              <span className="history-item__action">Toolbox — {tn.type}</span>
              <span className="history-item__meta">{formatDate(tn.timestamp)}</span>
              {tn.text && <span className="history-item__note">"{tn.text}"</span>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
