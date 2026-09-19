// Small request/response helpers shared by the API routes.

export function json(res, status, payload) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
}

export async function readBody(req, cap = 100_000) {
    if (req.method !== 'POST' && req.method !== 'PUT') return {};
    let raw = '';
    for await (const chunk of req) {
        raw += chunk;
        if (raw.length > cap) break;
    }
    try {
        return JSON.parse(raw || '{}');
    } catch {
        return {};
    }
}

export function clientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
    return req.socket?.remoteAddress || 'unknown';
}

/* Best-effort in-memory rate limiter (per serverless instance). */
const hits = new Map();

export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (arr.length >= limit) {
        hits.set(key, arr);
        return false;
    }
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 5000) {
        for (const [k, v] of hits) {
            if (v.every(t => now - t >= windowMs)) hits.delete(k);
            if (hits.size <= 2500) break;
        }
    }
    return true;
}
