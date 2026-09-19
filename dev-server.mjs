// Local dev server that mimics Vercel: serves static files + mounts /api
// serverless handlers using plain Node http. Load .env.local first.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

/* ── load .env.local into process.env ── */
const envFile = path.join(process.cwd(), '.env.local');
if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
    console.log('[dev] loaded .env.local');
}

const PORT = 8787;
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.md': 'text/markdown'
};

import chat from './api/chat.js';
import providers from './api/providers.js';
import login from './api/admin/login.js';
import adminVerify from './api/admin/verify.js';
import logout from './api/admin/logout.js';

const apiRoutes = {
    '/api/chat': { handler: chat, methods: ['POST'] },
    '/api/providers': { handler: providers, methods: ['GET', 'POST'] },
    '/api/admin/login': { handler: login, methods: ['POST'] },
    '/api/admin/verify': { handler: adminVerify, methods: ['GET'] },
    '/api/admin/logout': { handler: logout, methods: ['POST'] }
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const api = apiRoutes[url.pathname];

    if (api) {
        try {
            await api.handler(req, res);
        } catch (err) {
            console.error('[dev] api error:', err);
            if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'server_error', message: String(err.message || err) }));
        }
        return;
    }

    // static files
    let filePath = path.join(process.cwd(), url.pathname === '/' ? 'index.html' : url.pathname);
    filePath = path.normalize(filePath);
    if (!filePath.startsWith(path.normalize(process.cwd()))) {
        res.writeHead(403); res.end('forbidden'); return;
    }
    try {
        const data = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
    }
});

server.listen(PORT, () => {
    console.log(`[dev] serving static + /api on http://localhost:${PORT}`);
});
