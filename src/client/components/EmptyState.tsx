interface EmptyStateProps {
  type: 'clean' | 'private' | 'error' | 'no-user';
  message?: string;
}

const configs = {
  clean: {
    icon: '✓',
    title: 'No concerns found',
    body: 'This user has a clean record in this subreddit.',
  },
  private: {
    icon: '🔒',
    title: 'Private profile',
    body: "This user's profile is private. Only local subreddit history is available.",
  },
  error: {
    icon: '⚠',
    title: 'Something went wrong',
    body: 'Could not load context. Try again in a moment.',
  },
  'no-user': {
    icon: '?',
    title: 'User not found',
    body: 'No Reddit account was found with this username.',
  },
};

export default function EmptyState({ type, message }: EmptyStateProps) {
  const cfg = configs[type];
  return (
    <div className="state-shell" role="status">
      <span className="state-icon">{cfg.icon}</span>
      <p className="state-title">{cfg.title}</p>
      <p className="state-body">{message ?? cfg.body}</p>
    </div>
  );
}
