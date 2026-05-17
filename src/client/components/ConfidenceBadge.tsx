interface ConfidenceBadgeProps {
  level: 'high' | 'moderate' | 'limited';
}

const labels: Record<ConfidenceBadgeProps['level'], string> = {
  high: '✓ High confidence',
  moderate: '~ Partial data',
  limited: '! Limited data',
};

export default function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  return (
    <span className={`confidence-badge ${level}`} title="Data confidence level">
      {labels[level]}
    </span>
  );
}
