// POST /api/admin/login  { username, password }
// Validates against ADMIN_USERNAME / ADMIN_PASSWORD env vars (server-side only),
// applies per-IP lockout, and sets a signed HttpOnly session cookie (1 hour).

import { json, readBody, clientIp, rateLimit } from '../_lib/http.js';
import {
    adminConfigured, checkCredentials,
    createSessionToken, sessionCookieHeader
} from '../_lib/adminAuth.js';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return json(res, 405, { error: 'method_not_allowed' });
    }
    if (!adminConfigured()) {
        return json(res, 500, { error: 'server_config', message: 'Admin credentials are not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD on the server.' });
    }

    const ip = clientIp(req);
    const attemptsKey = 'adminlogin:' + ip;

    if (!rateLimit(attemptsKey, { limit: MAX_ATTEMPTS, windowMs: LOCKOUT_MS })) {
        return json(res, 429, { error: 'locked_out', waitSec: Math.ceil(LOCKOUT_MS / 1000), message: 'Too many failed attempts. Try again in 15 minutes.' });
    }

    const body = await readBody(req);
    const username = String(body.username || '');
    const password = String(body.password || '');

    if (!username || !password || !checkCredentials(username, password)) {
        return json(res, 401, { error: 'invalid_credentials', message: 'Invalid username or password.' });
    }

    res.setHeader('Set-Cookie', sessionCookieHeader(createSessionToken()));
    return json(res, 200, { ok: true });
}
