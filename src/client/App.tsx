import { useEffect, useReducer } from 'react';
import type { ContextResponse } from '../shared/types';
import LoadingState from './components/LoadingState';
import EmptyState from './components/EmptyState';
import SummaryPanel from './panels/SummaryPanel';
import SignalGrid from './panels/SignalGrid';
import HistoryTab from './panels/HistoryTab';
import QuickActions from './panels/QuickActions';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

type Tab = 'summary' | 'signals' | 'history';

type AppState =
  | { status: 'loading' }
  | { status: 'loaded'; data: ContextResponse; tab: Tab }
  | { status: 'error'; message: string }
  | { status: 'no-user' };

type AppAction =
  | { type: 'LOADED'; data: ContextResponse }
  | { type: 'ERROR'; message: string }
  | { type: 'NO_USER' }
  | { type: 'SET_TAB'; tab: Tab };

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOADED':
      return { status: 'loaded', data: action.data, tab: 'summary' };
    case 'ERROR':
      return { status: 'error', message: action.message };
    case 'NO_USER':
      return { status: 'no-user' };
    case 'SET_TAB':
      if (state.status !== 'loaded') return state;
      return { ...state, tab: action.tab };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// URL param extraction
// Devvit passes context via query params when navigating to the custom post
// ---------------------------------------------------------------------------

function getQueryParam(key: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

export default function App() {
  const [state, dispatch] = useReducer(reducer, { status: 'loading' });

  const username = getQueryParam('username') ?? 'unknown';
  const subredditName = getQueryParam('subreddit') ?? '';
  const contentId = getQueryParam('contentId') ?? '';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const params = new URLSearchParams({ username, subredditName, contentId });
        const res = await fetch(`/api/context/${encodeURIComponent(username)}?${params}`);

        if (!res.ok) {
          if (res.status === 404) {
            dispatch({ type: 'NO_USER' });
          } else {
            dispatch({ type: 'ERROR', message: `Server returned ${res.status}` });
          }
          return;
        }

        const data: ContextResponse = await res.json();
        if (!cancelled) dispatch({ type: 'LOADED', data });
      } catch (err) {
        if (!cancelled) {
          dispatch({
            type: 'ERROR',
            message: err instanceof Error ? err.message : 'Network error',
          });
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [username, subredditName, contentId]);

  // --- Action handlers (POST to server) ---

  async function handleAddNote(prefillText: string) {
    const note = window.prompt(`Add a mod note for u/${username}:`, prefillText);
    if (!note) return;
    await fetch('/api/actions/add-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subredditName, username, note }),
    });
  }

  async function handleRemove() {
    if (!window.confirm(`Remove this content by u/${username}?`)) return;
    await fetch('/api/actions/remove-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subredditName, contentId }),
    });
  }

  async function handleBan() {
    const reason = window.prompt(
      `Ban u/${username} from r/${subredditName}?\n\nEnter reason (or Cancel):`,
    );
    if (!reason) return;
    await fetch('/api/actions/ban-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subredditName, username, reason }),
    });
  }

  function handleDismiss() {
    // Signal to Devvit parent to close the WebView
    // In a custom post this is a no-op; the user closes the tab
    console.log('ContextLens: dismiss');
  }

  // --- Render ---

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error')   return <EmptyState type="error" message={state.message} />;
  if (state.status === 'no-user') return <EmptyState type="no-user" />;

  const { data, tab } = state;
  const { payload, signals, summary } = data;

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__top">
          <div className="app-header__logo" aria-hidden="true">CL</div>
          <span className="app-header__username" title={`u/${payload.username}`}>
            u/{payload.username}
          </span>
          <span className="app-header__meta">
            r/{subredditName || '—'}
          </span>
        </div>

        {/* Tabs */}
        <nav className="tabs" aria-label="Context sections">
          <button
            id="tab-summary"
            className={`tab-btn${tab === 'summary' ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'summary' })}
          >
            Summary
          </button>
          <button
            id="tab-signals"
            className={`tab-btn${tab === 'signals' ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'signals' })}
          >
            Signals
          </button>
          <button
            id="tab-history"
            className={`tab-btn${tab === 'history' ? ' active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', tab: 'history' })}
          >
            History
          </button>
        </nav>
      </header>

      {/* Scrollable body */}
      <main className="app-content">
        {tab === 'summary' && (
          <SummaryPanel payload={payload} summary={summary} />
        )}
        {tab === 'signals' && (
          <SignalGrid signals={signals} />
        )}
        {tab === 'history' && (
          <HistoryTab payload={payload} />
        )}
      </main>

      {/* Sticky action bar */}
      <QuickActions
        payload={payload}
        summary={summary}
        onAddNote={handleAddNote}
        onRemove={handleRemove}
        onBan={handleBan}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
