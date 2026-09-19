/* SecureAI chat page — name-gated entry, 100% local storage, zero tracking.
   Nothing about the visitor is persisted anywhere except their own browser. */
(function () {
    'use strict';

    /* ─── DOM refs ─── */
    const nameGate = document.getElementById('nameGate');
    const gateCard = document.getElementById('gateCard');
    const gateStatus = document.getElementById('gateStatus');
    const nameForm = document.getElementById('nameForm');
    const nameInput = document.getElementById('nameInput');
    const startChatBtn = document.getElementById('startChatBtn');

    const chatView = document.getElementById('chatView');
    const chatHero = document.getElementById('chatHero');
    const chatSuggestions = document.getElementById('chatSuggestions');
    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const wipeBtn = document.getElementById('wipeBtn');
    const modelBadge = document.getElementById('modelBadge');
    const charHint = document.getElementById('charHint');

    /* ─── Config / state ─── */
    const LS_NAME = 'chat_user_name';
    const LS_HISTORY = 'chat_history_v1';
    const LS_USAGE = 'chat_usage';
    const MAX_HISTORY = 50;
    const DAILY_LIMIT = 30;
    const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9 ._'-]{0,29}$/;
    let isSending = false;

    /* ─── Local storage helpers ─── */
    function loadJSON(key, fallback) {
        try {
            const v = JSON.parse(localStorage.getItem(key));
            return v == null ? fallback : v;
        } catch {
            return fallback;
        }
    }

    function saveJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch { /* storage full — ignore */ }
    }

    function todayStr() {
        return new Date().toISOString().slice(0, 10);
    }

    function usageToday() {
        const u = loadJSON(LS_USAGE, { date: todayStr(), count: 0 });
        return u.date === todayStr() ? u.count : 0;
    }

    function bumpUsage() {
        const count = usageToday() + 1;
        saveJSON(LS_USAGE, { date: todayStr(), count });
        return count;
    }

    /* ─── View switching ─── */
    function showGate() {
        chatView.style.display = 'none';
        nameGate.style.display = 'flex';
        nameInput.value = loadJSON(LS_NAME, null) || '';
        nameInput.focus();
    }

    function unlockChat(name) {
        nameGate.style.display = 'none';
        chatView.style.display = 'flex';

        const heroP = chatHero.querySelector('p');
        if (heroP && name) {
            heroP.textContent = `Hello ${name} — ask me anything about cybersecurity, networking, ethical hacking, or Ashish's skills and projects.`;
        }

        /* Restore saved history only after the markdown libs are ready */
        waitMdLibs().then(() => {
            const saved = loadJSON(LS_HISTORY, []);
            if (saved.length > 0) {
                saved.forEach(m => appendMessage(m.role, m.content, { persist: false }));
                hideGreeting();
            } else {
                chatInput.focus();
            }
            scrollToBottom();
        });
        loadModelBadge();
    }

    /* ─── Name gate ─── */
    nameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        if (!NAME_RE.test(name)) {
            gateStatus.className = 'gate-status is-error';
            gateStatus.textContent = 'Name must be 2–30 characters (letters, numbers, spaces, . _ \' -).';
            gateCard.classList.remove('shake');
            void gateCard.offsetWidth;
            gateCard.classList.add('shake');
            return;
        }
        saveJSON(LS_NAME, name);
        gateStatus.className = 'gate-status';
        unlockChat(name);
    });

    /* ─── API helper ─── */
    async function api(path, options) {
        let res;
        try {
            res = await fetch(path, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
        } catch {
            throw Object.assign(new Error('network'), { code: 'network' });
        }
        let data = {};
        try { data = await res.json(); } catch { /* non-JSON */ }
        if (!res.ok) {
            throw Object.assign(new Error(data.error || 'http_' + res.status), {
                code: data.error || 'http_' + res.status,
                status: res.status,
                data
            });
        }
        return data;
    }

    /* ─── Markdown rendering (marked + DOMPurify, loaded via defer) ─── */

    // Wait for the deferred CDN markdown libs so the first message renders as
    // proper markdown instead of falling back to plain text.
    function waitMdLibs(timeoutMs = 5000) {
        return new Promise(resolve => {
            const ready = () => typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined';
            if (ready()) return resolve(true);
            const start = Date.now();
            const timer = setInterval(() => {
                if (ready() || Date.now() - start > timeoutMs) {
                    clearInterval(timer);
                    resolve(ready());
                }
            }, 100);
        });
    }

    function renderMarkdown(text) {
        let md = String(text);
        /* Models often emit "## Heading" directly after a paragraph line with no
           blank line; CommonMark then keeps the ## as literal text. Force a blank
           line before ATX headings so they render properly. */
        md = md.replace(/(^|\n)(#{1,6}\s)/g, '$1\n$2');
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        const html = marked.parse(String(text), { breaks: true, mangle: false, headerIds: false });
        return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
    }

    /* ─── Messages ─── */
    function avatarLabel(role) {
        return role === 'user'
            ? '<div class="msg-avatar" aria-hidden="true">YOU</div>'
            : '<div class="msg-avatar" aria-hidden="true">&gt;_</div>';
    }

    function appendMessage(role, content, { persist = true, error = false } = {}) {
        const wrap = document.createElement('div');
        wrap.className = 'msg ' + role + (error ? ' error' : '');

        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        if (error || role === 'user') {
            bubble.textContent = content;
        } else {
            bubble.innerHTML = renderMarkdown(content);
        }

        wrap.innerHTML = avatarLabel(role);
        wrap.appendChild(bubble);
        chatMessages.appendChild(wrap);
        scrollToBottom();
        hideGreeting();

        if (persist && !error) {
            const list = loadJSON(LS_HISTORY, []);
            list.push({ role, content, t: Date.now() });
            saveJSON(LS_HISTORY, list.slice(-MAX_HISTORY));
        }
        return wrap;
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function hideGreeting() {
        if (chatHero) chatHero.classList.add('hidden');
        if (chatSuggestions) chatSuggestions.classList.add('hidden');
    }

    function showTyping() {
        const wrap = document.createElement('div');
        wrap.className = 'msg bot';
        wrap.id = 'typingMsg';
        wrap.innerHTML = avatarLabel('bot') +
            '<div class="msg-bubble"><span class="typing-dots" aria-label="AI is typing"><span></span><span></span><span></span></span></div>';
        chatMessages.appendChild(wrap);
        scrollToBottom();
    }

    function removeTyping() {
        const el = document.getElementById('typingMsg');
        if (el) el.remove();
    }

    /* ─── Sending ─── */
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        sendMessage();
    });

    chatInput.addEventListener('input', () => {
        const left = 1000 - chatInput.value.length;
        charHint.textContent = chatInput.value.length > 0 ? left + ' characters left' : '';
    });

    chatSuggestions.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (!chip) return;
        chatInput.value = chip.dataset.msg;
        sendMessage();
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || isSending) return;

        const used = usageToday();
        if (used >= DAILY_LIMIT) {
            appendMessage('bot',
                `Daily limit reached (${DAILY_LIMIT} messages/day, stored on your device). It resets at midnight — or use "Erase data" to start fresh.`,
                { persist: false, error: true });
            return;
        }

        isSending = true;
        chatSendBtn.disabled = true;
        chatInput.value = '';
        charHint.textContent = '';

        appendMessage('user', text);
        showTyping();

        try {
            /* let the deferred markdown libs finish loading while we wait on the API */
            const [history] = await Promise.all([
                Promise.resolve(loadJSON(LS_HISTORY, []).slice(-12).map(m => ({ role: m.role, content: m.content }))),
                waitMdLibs()
            ]);
            const data = await api('/api/chat', {
                method: 'POST',
                body: JSON.stringify({ messages: history })
            });
            removeTyping();
            appendMessage('bot', data.reply);
            const count = bumpUsage();
            updateBadgeRemaining(Math.max(0, DAILY_LIMIT - count));
        } catch (err) {
            removeTyping();
            let msg = (err.data && err.data.message) ||
                (err.code === 'network'
                    ? 'Chat server not reachable. The API routes require the Vercel deployment.'
                    : 'Something went wrong. Please try again.');
            /* Provider-level detail (e.g. "404 Not Found" or "invalid model") helps
               the owner debug the provider config — redacted server-side already. */
            if (err.data && err.data.detail) {
                msg += ' — provider said: ' + err.data.detail;
            }
            appendMessage('bot', msg, { persist: false, error: true });
        } finally {
            isSending = false;
            chatSendBtn.disabled = false;
            chatInput.focus();
            scrollToBottom();
        }
    }

    /* ─── New chat / wipe ─── */
    newChatBtn.addEventListener('click', () => {
        if (loadJSON(LS_HISTORY, []).length > 0 &&
            !confirm('Start a new chat? The current conversation will be cleared from this device.')) {
            return;
        }
        saveJSON(LS_HISTORY, []);
        chatMessages.innerHTML = '';
        chatHero.classList.remove('hidden');
        chatSuggestions.classList.remove('hidden');
        chatInput.focus();
    });

    wipeBtn.addEventListener('click', () => {
        if (!confirm('Erase ALL local chat data (your name + conversations) from this device? This cannot be undone.')) {
            return;
        }
        localStorage.removeItem(LS_NAME);
        localStorage.removeItem(LS_HISTORY);
        localStorage.removeItem(LS_USAGE);
        chatMessages.innerHTML = '';
        gateStatus.className = 'gate-status is-success';
        gateStatus.textContent = 'All local data erased. You are anonymous again.';
        showGate();
    });

    /* ─── Model badge ─── */
    async function loadModelBadge() {
        try {
            const data = await api('/api/providers');
            const dot = modelBadge.querySelector('.dot');
            if (data.configured && data.active) {
                dot.classList.remove('off');
                modelBadge.title = 'Active AI provider';
                modelBadge.textContent = '';
                modelBadge.appendChild(dot);
                modelBadge.appendChild(document.createTextNode(` ${data.active.model} @ ${data.active.name}`));
            } else {
                dot.classList.add('off');
                modelBadge.title = 'No AI provider configured yet';
                modelBadge.textContent = '';
                modelBadge.appendChild(dot);
                modelBadge.appendChild(document.createTextNode(' AI not configured yet'));
            }
        } catch {
            const dot = modelBadge.querySelector('.dot');
            dot.classList.add('off');
            modelBadge.textContent = '';
            modelBadge.appendChild(dot);
            modelBadge.appendChild(document.createTextNode(' provider offline'));
        }
    }

    function updateBadgeRemaining(remaining) {
        modelBadge.title = `${remaining} messages left today (device limit: ${DAILY_LIMIT})`;
    }

    /* ─── Hamburger (matches blog.html pattern) ─── */
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        const toggleNav = () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        };
        hamburger.addEventListener('click', toggleNav);
        hamburger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNav();
            }
        });
        navMenu.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    /* ─── Init ─── */
    const savedName = loadJSON(LS_NAME, null);
    if (savedName && NAME_RE.test(savedName)) {
        unlockChat(savedName);
    } else {
        showGate();
    }
})();
