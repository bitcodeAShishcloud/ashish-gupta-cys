// Admin Authentication — server-side via Vercel API routes.
// Credentials live ONLY in server env vars (ADMIN_USERNAME / ADMIN_PASSWORD).
// Sessions are signed HttpOnly cookies — localStorage can no longer grant access.

const AUTH_CONFIG = {
    sessionKey: 'admin_session_hint', // UI hint only — real gate is the server cookie
    sessionTimeout: 3600000 // 1 hour (matches the server cookie TTL)
};

// Security Policy Configurations (client-side UX; the server enforces the real lockout)
const SECURITY_CONFIG = {
    maxAttempts: 5,
    lockoutTime: 900000, // 15 minutes
    attemptsKey: 'admin_login_attempts',
    lockoutKey: 'admin_login_lockout_time',
    logsKey: 'admin_security_logs'
};

// SHA-256 hash function (used for the math captcha audit trail only)
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─── Lockout State Accessors (client-side UX) ─── */

function getFailedAttempts() {
    return parseInt(localStorage.getItem(SECURITY_CONFIG.attemptsKey)) || 0;
}

function setFailedAttempts(count) {
    localStorage.setItem(SECURITY_CONFIG.attemptsKey, count);
}

function getLockoutTime() {
    return parseInt(localStorage.getItem(SECURITY_CONFIG.lockoutKey)) || 0;
}

function setLockoutTime(timestamp) {
    localStorage.setItem(SECURITY_CONFIG.lockoutKey, timestamp);
}

function getRemainingLockout() {
    const lockoutTime = getLockoutTime();
    if (!lockoutTime) return 0;

    const now = Date.now();
    const remaining = lockoutTime - now;
    if (remaining <= 0) {
        setFailedAttempts(0);
        setLockoutTime(0);
        return 0;
    }
    return remaining;
}

/* ─── Visual Math Captcha Logic ─── */

let currentCaptchaResult = null;

// Cryptographically secure random int in [min, max]
function secureRandomInt(min, max) {
    const range = max - min + 1;
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return min + (buf[0] % range);
}

function generateCaptcha() {
    const num1 = secureRandomInt(2, 10);
    const num2 = secureRandomInt(2, 10);
    const operations = ['+', '-', '*'];
    const operation = operations[secureRandomInt(0, operations.length - 1)];

    let question = '';
    let result = 0;

    switch (operation) {
        case '+':
            question = `${num1} + ${num2}`;
            result = num1 + num2;
            break;
        case '-':
            if (num1 >= num2) {
                question = `${num1} - ${num2}`;
                result = num1 - num2;
            } else {
                question = `${num2} - ${num1}`;
                result = num2 - num1;
            }
            break;
        case '*':
            question = `${num1} × ${num2}`;
            result = num1 * num2;
            break;
    }

    currentCaptchaResult = result;

    const questionEl = document.getElementById('captchaQuestion');
    if (questionEl) {
        questionEl.textContent = question;
    }

    const captchaInput = document.getElementById('captchaInput');
    if (captchaInput) {
        captchaInput.value = '';
    }
}

/* ─── Local Security Audit Trail (display only) ─── */

function getSimulatedIP() {
    const octets = [
        '192.168.1.' + secureRandomInt(10, 89),
        '10.0.12.' + secureRandomInt(20, 219),
        '172.16.4.' + secureRandomInt(5, 93)
    ];
    return octets[secureRandomInt(0, octets.length - 1)];
}

function logSecurityEvent(action, details) {
    try {
        const logs = JSON.parse(localStorage.getItem(SECURITY_CONFIG.logsKey)) || [];
        logs.unshift({
            timestamp: Date.now(),
            ip: getSimulatedIP(),
            action,
            details
        });
        if (logs.length > 100) {
            logs.pop();
        }
        localStorage.setItem(SECURITY_CONFIG.logsKey, JSON.stringify(logs));
    } catch (e) {
        console.error('Audit logger failed:', e);
    }
}

/* ─── Lockout Timer Handler (client-side UX) ─── */

let lockoutInterval = null;

function checkAndRunLockoutTimer() {
    const remaining = getRemainingLockout();
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const captchaInput = document.getElementById('captchaInput');
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
    const lockoutBanner = document.getElementById('lockoutBanner');

    if (remaining > 0) {
        if (loginBtn) loginBtn.disabled = true;
        if (usernameInput) usernameInput.disabled = true;
        if (passwordInput) passwordInput.disabled = true;
        if (captchaInput) captchaInput.disabled = true;
        if (refreshCaptchaBtn) refreshCaptchaBtn.style.pointerEvents = 'none';

        if (lockoutBanner) {
            lockoutBanner.style.display = 'flex';
        }

        updateCountdownText(remaining);

        if (lockoutInterval) clearInterval(lockoutInterval);

        lockoutInterval = setInterval(() => {
            const curRemaining = getRemainingLockout();
            if (curRemaining <= 0) {
                clearInterval(lockoutInterval);

                if (loginBtn) loginBtn.disabled = false;
                if (usernameInput) usernameInput.disabled = false;
                if (passwordInput) passwordInput.disabled = false;
                if (captchaInput) captchaInput.disabled = false;
                if (refreshCaptchaBtn) refreshCaptchaBtn.style.pointerEvents = 'auto';
                if (lockoutBanner) lockoutBanner.style.display = 'none';

                logSecurityEvent('LOCKOUT_EXPIRED', 'Account lockout cool-off period expired. Access restored.');
                hideError();
                generateCaptcha();
            } else {
                updateCountdownText(curRemaining);
            }
        }, 1000);
    } else {
        if (lockoutBanner) {
            lockoutBanner.style.display = 'none';
        }
    }
}

function updateCountdownText(ms) {
    const countdownEl = document.getElementById('lockoutTimerText');
    if (countdownEl) {
        const totalSecs = Math.ceil(ms / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        countdownEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

/* ─── Login Form Handler ─── */

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (getRemainingLockout() > 0) {
                showError('Security Lockout is active. Please wait.');
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const captchaInput = document.getElementById('captchaInput');

            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            if (captchaInput) {
                const userVal = parseInt(captchaInput.value.trim());
                if (isNaN(userVal) || userVal !== currentCaptchaResult) {
                    showError('Incorrect Security Captcha result. Please try again.');
                    generateCaptcha();
                    return;
                }
            }

            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            hideError();

            await authenticateUser(username, password);
        });
    }

    if (refreshCaptchaBtn) {
        refreshCaptchaBtn.addEventListener('click', function (e) {
            e.preventDefault();
            generateCaptcha();
        });
    }

    if (usernameInput) {
        usernameInput.focus();
    }

    if (loginForm) {
        checkAndRunLockoutTimer();
        generateCaptcha();
    }
});

/* ─── Authenticate against the server ─── */

async function authenticateUser(username, password) {
    const loginBtn = document.getElementById('loginBtn');

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok && data.ok) {
            setFailedAttempts(0);
            setLockoutTime(0);
            logSecurityEvent('SUCCESSFUL_LOGIN', `Admin user "${username}" authenticated via server.`);

            localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify({
                authenticated: true,
                timestamp: Date.now(),
                username
            }));

            showSuccess('Login successful! Access granted. Redirecting...');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
            return;
        }

        // Failed — mirror the server-side lockout in the UI
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;

        if (res.status === 429 || data.error === 'locked_out') {
            const waitMs = (data.waitSec ? data.waitSec * 1000 : SECURITY_CONFIG.lockoutTime);
            setLockoutTime(Date.now() + waitMs);
            logSecurityEvent('LOCKOUT_TRIGGERED', 'Brute force defense triggered (server). Locked for 15 minutes.');
            checkAndRunLockoutTimer();
            showError('Too many failed attempts. Login locked for 15 minutes.');
            return;
        }

        if (res.status === 500 && data.error === 'server_config') {
            loginBtn.disabled = false;
            showError(data.message || 'Server is not configured with admin credentials.');
            return;
        }

        const attempts = getFailedAttempts() + 1;
        setFailedAttempts(attempts);
        logSecurityEvent('FAILED_LOGIN_ATTEMPT', `Failed login attempt for username: ${username}`);

        if (attempts >= SECURITY_CONFIG.maxAttempts) {
            setLockoutTime(Date.now() + SECURITY_CONFIG.lockoutTime);
            logSecurityEvent('LOCKOUT_TRIGGERED', 'Brute force defense triggered. Locked for 15 minutes.');
            checkAndRunLockoutTimer();
            showError('Too many failed attempts. Login locked for 15 minutes.');
        } else {
            const remaining = SECURITY_CONFIG.maxAttempts - attempts;
            showError(`Invalid username or password. ${remaining} attempts remaining before security lockout.`);
            generateCaptcha();
        }

        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.value = '';
            passwordField.focus();
        }
    } catch (error) {
        console.error('Authentication error:', error);
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        showError('Authentication service not reachable — the admin API requires the Vercel deployment.');
    }
}

/* ─── Session checks ─── */

// Quick local hint (UI only). The real gate is the server cookie via verifyAdminSession().
function isAuthenticated() {
    const sessionData = localStorage.getItem(AUTH_CONFIG.sessionKey);
    if (!sessionData) return false;

    try {
        const session = JSON.parse(sessionData);
        if (!session.authenticated) return false;
        return (Date.now() - session.timestamp) <= AUTH_CONFIG.sessionTimeout;
    } catch {
        return false;
    }
}

// Server-verified session check — resolves { ok: boolean }
async function verifyAdminSession() {
    try {
        const res = await fetch('/api/admin/verify', { cache: 'no-store' });
        if (!res.ok) return { ok: false };
        const data = await res.json().catch(() => ({}));
        return { ok: Boolean(data.ok) };
    } catch {
        return { ok: false, unreachable: true };
    }
}

// Protect admin page — content stays hidden until the server confirms the session.
function protectAdminPage() {
    verifyAdminSession().then(({ ok }) => {
        if (ok) {
            document.documentElement.classList.add('authenticated');
            refreshSession();
        } else {
            localStorage.removeItem(AUTH_CONFIG.sessionKey);
            window.location.href = 'admin-login.html';
        }
    });
}

// Refresh session timestamp + re-validate with the server
async function refreshSession() {
    const { ok } = await verifyAdminSession();
    if (!ok) {
        logout();
        return;
    }
    const sessionData = localStorage.getItem(AUTH_CONFIG.sessionKey);
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            session.timestamp = Date.now();
            localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
        } catch (error) {
            console.error('Error refreshing session:', error);
        }
    }
}

// Logout — clears the HttpOnly cookie server-side, then local hint
async function logout() {
    logSecurityEvent('LOGOUT', 'Admin session terminated by user action.');
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
    } catch { /* best effort */ }
    localStorage.removeItem(AUTH_CONFIG.sessionKey);
    window.location.href = 'admin-login.html';
}

/* ─── UI helpers ─── */

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorMessage && errorText) {
        errorMessage.style.background = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
        errorMessage.style.color = '#991b1b';
        errorMessage.style.borderColor = '#f87171';
        errorText.textContent = message;
        errorMessage.style.display = 'block';
    }
}

function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

function showSuccess(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    if (errorMessage && errorText) {
        errorMessage.style.background = 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)';
        errorMessage.style.color = '#065f46';
        errorMessage.style.borderColor = '#34d399';
        errorText.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
        errorMessage.style.display = 'block';
    }
}

// Export functions for use in testing if module system exists
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        verifyAdminSession,
        logout,
        protectAdminPage,
        refreshSession,
        logSecurityEvent,
        getFailedAttempts,
        getRemainingLockout
    };
}
