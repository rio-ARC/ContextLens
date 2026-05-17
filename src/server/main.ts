/**
 * ContextLens — Server bootstrap
 *
 * Devvit requires the server to use createServer from @devvit/server.
 * Hono app is passed as a Node.js-compatible request handler.
 */

import { createServer } from '@devvit/web/server';
import app from './index.js';

const server = createServer(async (req, res) => {
  // Convert Node.js IncomingMessage → Web Request for Hono
  const url = `http://localhost${req.url ?? '/'}`;
  const method = req.method ?? 'GET';

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  // Read body for POST/PUT
  let body: Buffer | null = null;
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    if (chunks.length > 0) {
      body = Buffer.concat(chunks);
    }
  }

  const webReq = new Request(url, {
    method,
    headers,
    body: body ?? undefined,
  });

  // Dispatch to Hono
  const webRes = await app.fetch(webReq);

  // Write response back
  res.statusCode = webRes.status;
  webRes.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const responseBody = await webRes.arrayBuffer();
  res.end(Buffer.from(responseBody));
});

const port = parseInt(process.env['PORT'] ?? '3000', 10);
server.listen(port, () => {
  console.log(`ContextLens server running on port ${port}`);
});
