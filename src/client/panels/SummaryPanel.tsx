import type { ContextPayload, NarrativeSummary } from '../../shared/types';
import ConfidenceBadge from '../components/ConfidenceBadge';

interface SummaryPanelProps {
  payload: ContextPayload;
  summary: NarrativeSummary;
}

function formatAge(days: number): string {
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function SummaryPanel({ payload, summary }: SummaryPanelProps) {
  return (
    <div className="summary-panel">
      {payload.dataPartial && (
        <div className="partial-banner">
          <span>⚠</span>
          Some data couldn't be retrieved. Results may be incomplete.
        </div>
      )}

      {/* Narrative */}
      <div className="narrative-card">
        <p className="narrative-card__text">{summary.text}</p>
      </div>

      {/* Stats grid */}
      <div className="user-stats">
        <div className="stat-chip">
          <span className="stat-chip__label">Account Age</span>
          <span className="stat-chip__value">{formatAge(payload.accountAgeDays)}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Karma</span>
          <span className="stat-chip__value">{formatNumber(payload.totalKarma)}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Comments / 30d</span>
          <span className="stat-chip__value">{payload.recentCommentCount}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip__label">Posts / 30d</span>
          <span className="stat-chip__value">{payload.recentPostCount}</span>
        </div>
      </div>

      {/* Confidence + profile flags */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <ConfidenceBadge level={payload.confidenceLevel} />
        {payload.isPrivateProfile && (
          <span className="confidence-badge limited">🔒 Private profile</span>
        )}
        {payload.postingBurst && (
          <span className="confidence-badge limited">⚡ Posting burst</span>
        )}
      </div>
    </div>
  );
}
