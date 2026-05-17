export default function LoadingState() {
  return (
    <div className="loading-shell" aria-label="Loading context" role="status">
      <div className="spinner" />
      <p className="loading-text">Loading user context…</p>
      {/* Skeleton preview */}
      <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton" style={{ height: 72 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60 }} />
          ))}
        </div>
      </div>
    </div>
  );
}
