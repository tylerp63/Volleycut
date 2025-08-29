import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { ViteDevServer } from "vite";
import type { IncomingMessage, ServerResponse } from "http";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Dev-only middleware to proxy Anthropic requests and avoid CORS from the browser
    mode === 'development' && {
      name: 'dev-anthropic-proxy',
      configureServer(server: ViteDevServer) {
        server.middlewares.use('/api/auto-tag', async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          try {
            if (req.method !== 'POST') return next();
            const apiKey = process.env.ANTHROPIC_API_KEY || '';
            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY on server' }));
              return;
            }

            const body = await new Promise<string>((resolve, reject) => {
              let data = '';
              req.on('data', (chunk: any) => { data += chunk; });
              req.on('end', () => resolve(data));
              req.on('error', reject);
            });
            const parsed = JSON.parse(body || '{}');
            const frames: string[] = Array.isArray(parsed?.frames) ? parsed.frames : [];
            if (!frames.length) {
              res.statusCode = 400;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'No frames provided' }));
              return;
            }

            const content: any[] = [
              { type: 'text', text: 'You are labeling volleyball actions. From the provided frames of a short clip, choose exactly one label from: Serve, Pass, Set, Attack, Block, Dig, Error. Respond with only the single word label.' }
            ];
            for (const d of frames) {
              const base64 = (typeof d === 'string' && d.includes(',')) ? d.split(',')[1] : d;
              content.push({
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
              });
            }

            const resp = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-3-5-haiku-latest',
                max_tokens: 50,
                temperature: 0,
                messages: [{ role: 'user', content }],
              }),
            });

            const data: any = await resp.json();
            if (!resp.ok) {
              res.statusCode = resp.status || 500;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: data?.error || 'Anthropic error' }));
              return;
            }
            const text: string = data?.content?.[0]?.text || '';

            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ text }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: err?.message || 'Server error' }));
          }
        });
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
