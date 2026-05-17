import type { ScoredSignal } from '../../shared/types';
import SignalCard from '../components/SignalCard';

interface SignalGridProps {
  signals: ScoredSignal[];
}

export default function SignalGrid({ signals }: SignalGridProps) {
  return (
    <div className="signal-grid">
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}
