# ContextLens

**ContextLens** is a Reddit Devvit moderation app built for the Reddit Mod Tools Hackathon.

The single most important design principle behind ContextLens: **Compress a 4-minute moderator investigation into a 30-second panel read.**

When a moderator right-clicks any post or comment and selects "View user context", a WebView panel opens instantly, showing all moderation-relevant signals for that user — replacing the manual workflow of checking 4–6 separate Reddit tabs.

## Features

- **Instant Context**: Right-click context menu integration for Posts and Comments.
- **Narrative Engine**: Generates a quick 30-second summary of a user's recent activity and moderation history.
- **Signal Scoring**: Highlights concern/watch signals such as posting bursts, new account status, low karma, or recent removals.
- **Quick Actions**: Quickly add mod notes, remove content, or ban users directly from the context panel.
- **Toolbox Integration**: Parses existing Toolbox usernotes.

## Tech Stack

- **Devvit**: Reddit's developer platform for custom apps.
- **Hono**: A fast, lightweight web framework used for the server-side API.
- **React & Vite**: Used for the frontend WebView panel, providing a smooth and responsive UI.
- **esbuild**: Used for custom bundling of the Node.js server to ensure compatibility within the Devvit sandbox runtime.

## Project Structure

```
ModBrief/
├── src/
│   ├── client/       # React frontend for the WebView panel
│   │   ├── components/
│   │   ├── panels/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── server/       # Hono backend and Devvit integration
│   │   ├── index.ts  # Main Devvit/Hono entry point
│   │   ├── contextAggregator.ts
│   │   ├── narrativeEngine.ts
│   │   └── signalScorer.ts
│   └── shared/       # Shared types between client and server
├── assets/           # App icons
├── devvit.json       # Devvit app configuration
└── package.json      # Node.js dependencies and build scripts
```

## Setup & Deployment

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Local Development (Client)**
   ```bash
   npm run dev
   ```

3. **Build the Project**
   This compiles both the Vite client and the esbuild server bundle.
   ```bash
   npm run build
   ```

4. **Upload to Devvit**
   Ensure you have the Devvit CLI installed and authenticated.
   ```bash
   devvit upload
   ```

5. **Install on a Test Subreddit**
   ```bash
   devvit install <your_test_subreddit>
   ```

## License

MIT
