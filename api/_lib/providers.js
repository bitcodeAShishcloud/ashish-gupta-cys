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

/* Normalize: strip trailing slash so baseUrl + '/chat/completions' is safe */
export function normalizeBaseUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '');
}

/* Minimal OpenAI-compatible chat completion call. */
export async function callProvider(provider, messages, { maxTokens = 900, timeoutMs = 30000 } = {}) {
    const baseUrl = normalizeBaseUrl(provider.baseUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`
    };
    // OpenRouter-specific attribution headers (ignored by other providers)
    if (/openrouter\.ai$/i.test(new URL(baseUrl).hostname)) {
        headers['HTTP-Referer'] = process.env.PUBLIC_SITE_URL || 'https://ashish-gupta-portfolio.vercel.app';
        headers['X-Title'] = 'Ashish Gupta Portfolio Chat';
    }

    try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            signal: controller.signal,
            body: JSON.stringify({
                model: provider.model,
                messages,
                temperature: 0.7,
                max_tokens: maxTokens
            })
        });

        const text = await res.text();
        let data = null;
        try { data = text ? JSON.parse(text) : null; } catch { data = null; }

        if (!res.ok) {
            const err = new Error(data?.error?.message || text || `HTTP ${res.status}`);
            err.status = res.status;
            throw err;
        }
        const reply = data?.choices?.[0]?.message?.content;
        if (!reply) throw new Error('Provider returned an empty response');
        return reply;
    } finally {
        clearTimeout(timer);
    }
}
