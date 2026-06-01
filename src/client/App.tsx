import { useEffect, useState } from 'react';
import type { ContextResponse } from '../shared/types';
import LoadingState from './components/LoadingState';
import SummaryPanel from './panels/SummaryPanel';
import SignalGrid from './panels/SignalGrid';
import HistoryTab from './panels/HistoryTab';
import QuickActions from './panels/QuickActions';

export default function App() {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error' | 'forbidden'>('loading');
  const [tab, setTab] = useState<'summary' | 'signals' | 'history'>('summary');
  const [data, setData] = useState<ContextResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [resolvedUsername, setResolvedUsername] = useState('');
  const [resolvedSubreddit, setResolvedSubreddit] = useState('');
  const [resolvedContentId, setResolvedContentId] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus('loading');
      try {
        const queryParams = new URLSearchParams(window.location.search);
        let u = queryParams.get('username') || '';
        let s = queryParams.get('subreddit') || '';
        let cId = queryParams.get('contentId') || '';

        if (!u) {
          const pendingRes = await fetch('/api/pending-user');
          if (pendingRes.status === 403) {
            if (!cancelled) setStatus('forbidden');
            return;
          }
          if (pendingRes.ok) {
            const pendingData = await pendingRes.json();
            u = pendingData.username || '';
            s = pendingData.subredditName || '';
            cId = pendingData.contentId || '';
          }
        }

        if (!u) {
          if (!cancelled) setStatus('error');
          return;
        }

        if (!cancelled) {
          setResolvedUsername(u);
          setResolvedSubreddit(s);
          setResolvedContentId(cId);
        }

        const res = await fetch(`/api/context/${encodeURIComponent(u)}?subredditName=${encodeURIComponent(s)}`);
        if (res.status === 403) {
          if (!cancelled) setStatus('forbidden');
          return;
        }
        if (!res.ok) {
          if (!cancelled) setStatus('error');
          return;
        }
        const responseData: ContextResponse = await res.json();
        if (!cancelled) {
          setData(responseData);
          setStatus('loaded');
        }
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  if (status === 'loading') {
    return <LoadingState />;
  }

  if (status === 'forbidden') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
          color: '#e6edf3',
          padding: '24px',
          boxSizing: 'border-box',
          backgroundColor: '#0d1117',
        }}
      >
        <div style={{ fontSize: '3rem' }}>🚫</div>
        <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f85149', textAlign: 'center' }}>
          Not Authorized
        </p>
        <p style={{ fontSize: '0.95rem', color: '#8b949e', textAlign: 'center', maxWidth: '320px' }}>
          You must be a moderator of this subreddit to view the ContextLens dashboard.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '16px',
          color: '#e6edf3',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>Failed to load context</p>
        <button
          onClick={() => setRetryCount((prev) => prev + 1)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#21262d',
            border: '1px solid #30363d',
            borderRadius: '6px',
            color: '#58a6ff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0d1117',
      }}
    >
      {/* Tab bar at top */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #30363d',
          backgroundColor: '#161b22',
        }}
      >
        {(['summary', 'signals', 'history'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid #58a6ff' : '2px solid transparent',
              color: tab === t ? '#58a6ff' : '#8b949e',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content area (scrollable) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingBottom: '80px',
        }}
      >
        {tab === 'summary' && data && (
          <SummaryPanel payload={data.payload} summary={data.summary} />
        )}
        {tab === 'signals' && data && (
          <SignalGrid signals={data.signals} />
        )}
        {tab === 'history' && data && (
          <HistoryTab events={data.payload.subredditRemovals} />
        )}
      </div>

      {/* QuickActions bar fixed to bottom (always visible) */}
      {data && (
        <QuickActions
          username={resolvedUsername}
          subredditName={resolvedSubreddit}
          contentId={resolvedContentId}
          summaryText={data.summary.text}
        />
      )}
    </div>
  );
}
