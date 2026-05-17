import type { ScoredSignal } from '../../shared/types';

interface SignalCardProps {
  signal: ScoredSignal;
}

export default function SignalCard({ signal }: SignalCardProps) {
  return (
    <div className={`signal-card ${signal.severity}`}>
      <i className={`${signal.icon} signal-card__icon`} aria-hidden="true" />
      <span className="signal-card__label">{signal.label}</span>
      <span className="signal-card__value">{signal.value}</span>
    </div>
  );
}
