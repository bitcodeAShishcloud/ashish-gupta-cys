// AI provider registry — configured entirely via the AI_PROVIDERS_JSON env var
// on Vercel (no database, no server-side storage). API keys live only in the
// server environment and never reach the browser.

import net from 'node:net';

/*
 Expected env var format:
 {
   "activeId": "p1",
   "providers": [
     { "id": "p1", "name": "OpenRouter", "baseUrl": "https://openrouter.ai/api/v1",
       "apiKey": "sk-or-…", "model": "qwen/qwen3-max:free" }
   ]
 }
 A bare array is also accepted (first entry = active).
*/
export function loadProviderConfig() {
    const raw = process.env.AI_PROVIDERS_JSON;
    if (raw) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return { activeId: parsed[0].id, providers: parsed };
            }
            if (parsed && Array.isArray(parsed.providers) && parsed.providers.length > 0) {
                return { activeId: parsed.activeId || parsed.providers[0].id, providers: parsed.providers };
            }
        } catch (err) {
            console.error('AI_PROVIDERS_JSON is not valid JSON:', err.message);
        }
    }
    return { activeId: null, providers: [] };
}

export function getActiveProvider(config) {
    return config.providers.find(p => p.id === config.activeId) || config.providers[0] || null;
}

/* Outbound host validation: only https to public hosts is allowed. */
export function validateProviderUrl(rawUrl) {
    let url;
    try {
        url = new URL(String(rawUrl));
    } catch {
        return 'Invalid URL';
    }
    if (url.protocol !== 'https:') return 'Only https:// base URLs are allowed';
    const host = url.hostname.toLowerCase().replace(/\.$/, '').replace(/^\[/, '').replace(/\]$/, '');
    if (!host) return 'Missing hostname';
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
        return 'Local hostnames are not allowed';
    }
    if (host === 'metadata.google.internal' || host === '169.254.169.254') {
        return 'Reserved addresses are not allowed';
    }
    if (net.isIP(host)) {
        if (isPrivateOrReservedIP(host)) {
            return 'Private or reserved IP addresses are not allowed';
        }
        return null; // public IP literal
    }
    return null;
}

function isPrivateOrReservedIP(ip) {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split('.').map(Number);
        return (
            a === 10 || a === 127 || a === 0 ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 169 && b === 254) ||
            (a === 100 && b >= 64 && b <= 127) ||
            a >= 224
        );
    }
    const first = ip.split(':')[0].toLowerCase();
    return first === 'fe80' || first === 'fc' || first === 'fd' || ip === '::1' || ip === '::';
}

/* Normalize: strip trailing slash so baseUrl + endpoint joins safely */
export function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

/* Optional endpoint path, must be a clean absolute path (no query, no //). */
export function normalizeEndpoint(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return '/chat/completions';
    const path = String(raw).trim();
    if (!path.startsWith('/')) return null;
    if (path.includes('//') || path.includes('?') || path.includes('#')) return null;
    return path;
}

/* Resolve a dotted path (with numeric index segments) in a JSON value. */
export function resolvePath(data, dotted) {
    if (!dotted || data === undefined || data === null) return undefined;
    return String(dotted).split('.').reduce((node, key) => {
        if (node === undefined || node === null) return undefined;
        return node[key];
    }, data);
}

/* Rough token estimate for client-text (1 token ≈ 4 chars). */
export function estimateTokens(text) {
    return Math.max(4, Math.round(String(text).length / 4));
}

/* Trim history to fit the provider's context window (system prompt always kept). */
export function trimToContext(systemPrompt, history, contextWindow, maxOutput) {
    const budget = Math.max(2000, Number(contextWindow) || 32000) - Math.max(200, Number(maxOutput) || 900) - 200;
    const msgs = [{ role: 'system', content: systemPrompt }];
    let used = estimateTokens(systemPrompt);
    const picked = [];
    for (let i = history.length - 1; i >= 0 && picked.length < 24; i--) {
        const m = history[i];
        const cost = estimateTokens(m.content) + 4;
        if (used + cost > budget) break;
        picked.unshift(m);
        used += cost;
    }
    return msgs.concat(picked);
}

export function providerDefaults(provider) {
    const d = provider || {};
    return {
        endpoint: normalizeEndpoint(d.endpoint) || '/chat/completions',
        authHeader: String(d.authHeader || '').trim() || 'Authorization',
        authPrefix: d.authPrefix === undefined ? 'Bearer ' : String(d.authPrefix),
        responseField: d.responseField ? String(d.responseField) : null,
        // Upper bounds only clamp absurd/mistyped values; real provider caps pass through.
        maxOutput: Math.min(196608, Math.max(100, Number(d.maxOutput) || 900)),
        contextWindow: Math.min(2000000, Math.max(2000, Number(d.contextWindow) || 32000))
    };
}

/* Flexible provider call: OpenAI-compatible by default, but endpoint / auth
   header / key prefix / response path are all configurable so non-OpenAI
   providers (e.g. custom /v1/chat/message style APIs) work too. */
export async function callProvider(provider, messages, { timeoutMs = 30000 } = {}) {
    const c = providerDefaults(provider);
    const baseUrl = normalizeBaseUrl(provider.baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = { 'Content-Type': 'application/json' };
    headers[c.authHeader] = c.authPrefix + String(provider.apiKey || '');
    // OpenRouter-specific attribution headers (ignored by other providers)
    try {
        if (/openrouter\.ai$/i.test(new URL(baseUrl).hostname)) {
            headers['HTTP-Referer'] = process.env.PUBLIC_SITE_URL || 'https://ashish-gupta-cys-portfolio.vercel.app';
            headers['X-Title'] = 'Ashish Gupta Portfolio Chat';
        }
    } catch { /* bad baseUrl is caught later */ }

    try {
        const res = await fetch(baseUrl + c.endpoint, {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature: 0.7,
                max_tokens: c.maxOutput
            })
        });

        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }

        if (!res.ok) {
            const detailRaw = data?.error?.message || data?.message || data?.msg || data?.detail || text || `HTTP ${res.status}`;
            const detail = String(detailRaw).slice(0, 300);
            const err = new Error(detail);
            err.status = res.status;
            err.detail = detail;
            throw err;
        }

        let reply;
        if (c.responseField) {
            reply = resolvePath(data, c.responseField);
            if (reply === undefined || reply === null || reply === '') {
                const err = new Error(`Provider reply not found at responseField "${c.responseField}"`);
                err.status = 502;
                err.detail = 'Response did not contain the configured responseField — check the provider docs.';
                throw err;
            }
        } else {
            // OpenAI-style first, then common fallbacks
            reply = resolvePath(data, 'choices.0.message.content');
            if (reply === undefined || reply === null || reply === '') {
                reply = resolvePath(data, 'choices.0.text')
                    ?? data?.reply ?? data?.response ?? data?.answer ?? data?.message;
            }
            if (typeof reply !== 'string' || reply.trim() === '') {
                const err = new Error('Provider returned an empty or unrecognized response');
                err.status = 502;
                err.detail = `Got keys: ${data ? Object.keys(data).join(', ') : 'non-JSON body'} — set "Response Field" in the provider config if it is not OpenAI-compatible.`;
                throw err;
            }
        }

        const out = String(reply).slice(0, 12000);
        if (!out.trim()) throw new Error('Provider returned an empty response');
        return out;
    } finally {
        clearTimeout(timer);
    }
}
