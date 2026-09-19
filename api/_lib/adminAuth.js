// Server-side admin auth: credentials come from env vars (never the JS bundle),
// sessions are HMAC-signed HttpOnly cookies. No database — fully stateless.

import crypto from 'node:crypto';

export const SESSION_COOKIE = 'admin_session';
export const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour

function adminCredentials() {
    return {
        username: process.env.ADMIN_USERNAME || '',
        password: process.env.ADMIN_PASSWORD || ''
    };
}

function sessionSecret() {
    // Dedicated secret if provided, otherwise derived from the admin password
    return process.env.ADMIN_SESSION_SECRET ||
        crypto.createHash('sha256').update((process.env.ADMIN_PASSWORD || '') + ':admin-session').digest('hex');
}

export function adminConfigured() {
    const { username, password } = adminCredentials();
    return username.length > 0 && password.length >= 8;
}

export function timingSafeEqualStr(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export function checkCredentials(username, password) {
    const expected = adminCredentials();
    // Compare hashes (not raw) so timingSafeEqual lengths don't leak hints
    const h = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
    return timingSafeEqualStr(h(username), h(expected.username)) &&
        timingSafeEqualStr(h(password), h(expected.password));
}

export function createSessionToken() {
    const exp = Date.now() + SESSION_TTL_MS;
    const sig = crypto.createHmac('sha256', sessionSecret()).update(`admin|${exp}`).digest('hex');
    return `${exp}|${sig}`;
}

export function verifySessionToken(token) {
    if (!token) return false;
    const parts = String(token).split('|');
    if (parts.length !== 2) return false;
    const exp = Number(parts[0]);
    if (!Number.isFinite(exp) || Date.now() > exp) return false;
    const expected = crypto.createHmac('sha256', sessionSecret()).update(`admin|${exp}`).digest('hex');
    return timingSafeEqualStr(parts[1], expected);
}

export function getCookie(req, name) {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        if (part.slice(0, idx).trim() === name) {
            return decodeURIComponent(part.slice(idx + 1).trim());
        }
    }
    return null;
}

export function isAdminRequest(req) {
    return verifySessionToken(getCookie(req, SESSION_COOKIE));
}

export function sessionCookieHeader(token) {
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export function clearSessionCookieHeader() {
    return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
