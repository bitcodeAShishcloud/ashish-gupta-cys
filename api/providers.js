// GET  /api/providers → active provider info (no secrets)
// POST /api/providers (admin session cookie required)
//   { action: 'test', provider: { baseUrl, apiKey, model,
//       endpoint?, authHeader?, authPrefix?, responseField?,
//       contextWindow?, maxOutput? } }
//        → live connection test with caller-supplied credentials (nothing stored)

import { json, readBody, clientIp, rateLimit } from './_lib/http.js';
import { isAdminRequest } from './_lib/adminAuth.js';
import {
    loadProviderConfig, getActiveProvider,
    validateProviderUrl, normalizeBaseUrl, normalizeEndpoint, callProvider
} from './_lib/providers.js';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const config = loadProviderConfig();
        const active = getActiveProvider(config);
        return json(res, 200, {
            active: active ? { name: active.name, model: active.model } : null,
            configured: Boolean(active && active.apiKey && active.model),
            providers: config.providers.map(p => ({
                name: p.name, model: p.model, baseUrl: p.baseUrl,
                endpoint: p.endpoint || 'default'
            }))
        });
    }

    if (req.method !== 'POST') {
        return json(res, 405, { error: 'method_not_allowed' });
    }
    if (!isAdminRequest(req)) {
        return json(res, 401, { error: 'unauthorized', message: 'Admin login required.' });
    }
    if (!rateLimit('providers:' + clientIp(req), { limit: 10 })) {
        return json(res, 429, { error: 'rate_limited', message: 'Too many requests.' });
    }

    const body = await readBody(req);
    if (body.action !== 'test') {
        return json(res, 400, { error: 'bad_request', message: 'Unknown action.' });
    }

    const p = body.provider || {};
    const baseUrl = normalizeBaseUrl(p.baseUrl);
    const model = String(p.model || '').trim();
    const apiKey = String(p.apiKey || '').trim();
    if (!baseUrl || !model || !apiKey) {
        return json(res, 400, { error: 'bad_request', message: 'Base URL, API key and model are all required to test.' });
    }
    const urlError = validateProviderUrl(baseUrl);
    if (urlError) return json(res, 400, { error: 'bad_request', message: urlError });

    // Advanced fields (optional — validate shapes so bad config fails early)
    if (p.endpoint !== undefined) {
        const ep = normalizeEndpoint(p.endpoint);
        if (!ep) return json(res, 400, { error: 'bad_request', message: 'Endpoint must be a clean absolute path like /v1/chat/messages (no query, no //).' });
    }

    const testProvider = {
        baseUrl, apiKey, model,
        endpoint: p.endpoint,
        authHeader: p.authHeader,
        authPrefix: p.authPrefix,
        responseField: p.responseField,
        contextWindow: p.contextWindow ? Number(p.contextWindow) : undefined,
        maxOutput: p.maxOutput ? Number(p.maxOutput) : undefined,
    };

    try {
        const reply = await callProvider({ ...testProvider, maxOutput: 10 },
            [{ role: 'user', content: 'Reply with exactly: OK' }],
            { timeoutMs: 20000 });
        return json(res, 200, { ok: true, reply: String(reply).slice(0, 120) });
    } catch (err) {
        if (err.name === 'AbortError') {
            return json(res, 200, { ok: false, message: 'Timeout — provider did not respond in 20s.', detail: err.detail || '' });
        }
        const detail = String(err.detail || err.message || '').replace(apiKey, '***').slice(0, 300);
        return json(res, 200, { ok: false, message: `Provider returned HTTP ${err.status || 'network error'}: ${detail}` });
    }
}
