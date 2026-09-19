// POST /api/chat  { messages: [{role, content}] }
// Proxies to the active OpenAI-compatible provider. No user data is stored
// server-side: no cookies, no database — chat history lives only in the
// visitor's browser. The provider API key never leaves the server.

import { json, readBody, clientIp, rateLimit } from './_lib/http.js';
import {
    loadProviderConfig, getActiveProvider,
    validateProviderUrl, callProvider
} from './_lib/providers.js';

const MAX_HISTORY = 16; // messages sent upstream (8 turns)
const RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT) || 20; // requests / min / IP

const SYSTEM_PROMPT = `You are SecureAI, the assistant embedded in Ashish Gupta's cybersecurity portfolio website.
Ashish is a 2nd-year B.Tech Cyber Security student and developer. His portfolio covers: about, skills (network security, web security, Linux, Python, JavaScript), projects, certifications, a home lab, a blog, and a gallery.
Guidelines:
- Be helpful, concise and friendly. Default to short answers; use markdown (bold, lists, fenced code blocks) when it improves clarity.
- You can answer general cybersecurity, networking, and programming questions, and questions about Ashish's skills and projects using the portfolio context above.
- For anything you are unsure about regarding Ashish's personal details, say you are not certain.
- Never help with illegal activity. For offensive-security questions, keep answers educational and high-level.
- Reply in the language the user writes in.`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return json(res, 405, { error: 'method_not_allowed' });
    }
    if (!rateLimit('chat:' + clientIp(req), { limit: RATE_LIMIT })) {
        return json(res, 429, { error: 'rate_limited', message: 'Too many requests. Slow down a little.' });
    }

    const body = await readBody(req);
    const messages = Array.isArray(body.messages) ? body.messages : null;
    if (!messages || messages.length === 0) {
        return json(res, 400, { error: 'no_messages' });
    }

    // Sanitize + cap history sent upstream
    const clean = [];
    for (const m of messages.slice(-MAX_HISTORY)) {
        if (!m || typeof m.content !== 'string') continue;
        const role = m.role === 'assistant' ? 'assistant' : 'user';
        const content = m.content.slice(0, 4000).trim();
        if (!content) continue;
        clean.push({ role, content });
    }
    if (clean.length === 0 || clean[clean.length - 1].role !== 'user') {
        return json(res, 400, { error: 'no_messages' });
    }

    const provider = getActiveProvider(loadProviderConfig());
    if (!provider || !provider.apiKey || !provider.model) {
        return json(res, 503, { error: 'provider_not_configured', message: 'No AI provider is configured yet. The site owner needs to set AI_PROVIDERS_JSON on the server.' });
    }
    const urlError = validateProviderUrl(provider.baseUrl);
    if (urlError) {
        return json(res, 503, { error: 'provider_not_configured', message: 'Active provider has an invalid base URL.' });
    }

    let reply;
    try {
        reply = await callProvider(provider, [{ role: 'system', content: SYSTEM_PROMPT }, ...clean]);
    } catch (err) {
        if (err.name === 'AbortError') {
            return json(res, 504, { error: 'upstream_timeout', message: 'The AI provider took too long to respond. Try again.' });
        }
        const status = err.status || 502;
        if (status === 401 || status === 403) {
            return json(res, 502, { error: 'provider_auth', message: 'The AI provider rejected its API key. Check the server configuration.' });
        }
        if (status === 429) {
            return json(res, 502, { error: 'provider_rate_limited', message: 'The AI provider is rate limiting right now. Try again in a moment.' });
        }
        console.error('Provider call failed:', status, err.message);
        return json(res, 502, { error: 'upstream_error', message: 'The AI provider failed to respond. Try again shortly.' });
    }

    return json(res, 200, { reply, model: provider.model, provider: provider.name });
}
