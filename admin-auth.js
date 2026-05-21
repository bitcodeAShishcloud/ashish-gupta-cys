// Admin Authentication & Cybersecurity Protection System
// Credentials are secure hashed (SHA-256)

const AUTH_CONFIG = {
    // Hashed credentials (SHA-256)
    usernameHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin
    passwordHash: '48c0be548f4c42613938ad25af203e17261ed0449c9f441fd906f9e7833aef98',
    sessionKey: 'admin_authenticated',
    sessionTimeout: 3600000 // 1 hour in milliseconds
};

// Security Policy Configurations
const SECURITY_CONFIG = {
    maxAttempts: 5,
    lockoutTime: 900000, // 15 minutes (in milliseconds)
    attemptsKey: 'admin_login_attempts',
    lockoutKey: 'admin_login_lockout_time',
    logsKey: 'admin_security_logs'
};

// SHA-256 hash function
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Lockout State Accessors
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
        // Lockout expired, reset counters
        setFailedAttempts(0);
        setLockoutTime(0);
        return 0;
    }
    return remaining;
}

// Visual Math Captcha Logic
let currentCaptchaResult = null;

function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 2; // numbers 2-10
    const num2 = Math.floor(Math.random() * 9) + 2;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
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

// Simulated Security Auditing
function getSimulatedIP() {
    // Generate a realistic local/external simulated IP for visual aesthetics
    const octets = [
        '192.168.1.' + Math.floor(Math.random() * 80 + 10),
        '10.0.12.' + Math.floor(Math.random() * 200 + 20),
        '172.16.4.' + Math.floor(Math.random() * 90 + 5)
    ];
    return octets[Math.floor(Math.random() * octets.length)];
}

function logSecurityEvent(action, details) {
    try {
        const logs = JSON.parse(localStorage.getItem(SECURITY_CONFIG.logsKey)) || [];
        const newEvent = {
            timestamp: Date.now(),
            ip: getSimulatedIP(),
            action: action, // 'SUCCESSFUL_LOGIN', 'FAILED_LOGIN_ATTEMPT', 'LOCKOUT_TRIGGERED', 'LOGOUT', 'LOCKOUT_EXPIRED'
            details: details
        };
        logs.unshift(newEvent);
        
        // Cap at 100 entries
        if (logs.length > 100) {
            logs.pop();
        }
        localStorage.setItem(SECURITY_CONFIG.logsKey, JSON.stringify(logs));
    } catch (e) {
        console.error('Audit logger failed:', e);
    }
}

// Lockout Timer Handler
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
        // Lockdown all login interface elements
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
                
                // Restore form
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

// Login Form Handler
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const togglePassword = document.getElementById('togglePassword');
    const refreshCaptchaBtn = document.getElementById('refreshCaptcha');

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle icon
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            // First check if locked out
            if (getRemainingLockout() > 0) {
                showError('Security Lockout is active. Please wait.');
                return;
            }

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const captchaInput = document.getElementById('captchaInput');

            // Validate inputs
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            // Verify Captcha
            if (captchaInput) {
                const userVal = parseInt(captchaInput.value.trim());
                if (isNaN(userVal) || userVal !== currentCaptchaResult) {
                    showError('Incorrect Security Captcha result. Please try again.');
                    generateCaptcha();
                    return;
                }
            }

            // Show loading state
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            hideError();

            // Simulate slight authentication verification latency
            setTimeout(async () => {
                await authenticateUser(username, password);
            }, 800);
        });
    }

    // Refresh Captcha hook
    if (refreshCaptchaBtn) {
        refreshCaptchaBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateCaptcha();
        });
    }

    // Auto-focus username field and run startup checks
    if (usernameInput) {
        usernameInput.focus();
    }
    
    // Check lockout on load
    if (loginForm) {
        checkAndRunLockoutTimer();
        generateCaptcha();
    }
});

// Authenticate user with hashed credentials
async function authenticateUser(username, password) {
    const loginBtn = document.getElementById('loginBtn');

    try {
        // Hash inputs
        const usernameHashInput = await sha256(username);
        const passwordHashInput = await sha256(password);

        // Compare credentials
        if (usernameHashInput === AUTH_CONFIG.usernameHash &&
            passwordHashInput === AUTH_CONFIG.passwordHash) {

            // Success: Reset failed attempts & lockout
            setFailedAttempts(0);
            setLockoutTime(0);

            // Log event
            logSecurityEvent('SUCCESSFUL_LOGIN', `Admin user "${username}" authenticated successfully.`);

            // Create session
            const session = {
                authenticated: true,
                timestamp: Date.now(),
                username: username
            };

            // Store session
            localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));

            // Show success and redirect
            showSuccess('Login successful! Access granted. Redirecting...');

            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            // Authentication failed
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;

            const attempts = getFailedAttempts() + 1;
            setFailedAttempts(attempts);
            
            logSecurityEvent('FAILED_LOGIN_ATTEMPT', `Failed login attempt for username: ${username}`);

            if (attempts >= SECURITY_CONFIG.maxAttempts) {
                const lockoutTime = Date.now() + SECURITY_CONFIG.lockoutTime;
                setLockoutTime(lockoutTime);
                logSecurityEvent('LOCKOUT_TRIGGERED', `Brute force defense triggered. Locked for 15 minutes.`);
                
                checkAndRunLockoutTimer();
                showError('Too many failed attempts. Login locked for 15 minutes.');
            } else {
                const remaining = SECURITY_CONFIG.maxAttempts - attempts;
                showError(`Invalid username or password. ${remaining} attempts remaining before security lockout.`);
                generateCaptcha();
            }

            // Clear password field
            const passwordInput = document.getElementById('password');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (error) {
        console.error('Authentication error:', error);
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        showError('Security authentication error. Please try again.');
    }
}

// Check if user is authenticated
function isAuthenticated() {
    const sessionData = localStorage.getItem(AUTH_CONFIG.sessionKey);

    if (!sessionData) {
        return false;
    }

    try {
        const session = JSON.parse(sessionData);

        // Check if session is valid
        if (!session.authenticated) {
            return false;
        }

        // Check if session has expired
        const currentTime = Date.now();
        const sessionAge = currentTime - session.timestamp;

        if (sessionAge > AUTH_CONFIG.sessionTimeout) {
            // Session expired
            logout();
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Logout function
function logout() {
    logSecurityEvent('LOGOUT', 'Admin session terminated by user action.');
    localStorage.removeItem(AUTH_CONFIG.sessionKey);
    window.location.href = 'admin-login.html';
}

// Show error message
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

// Hide error message
function hideError() {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.style.display = 'none';
    }
}

// Show success message
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

// Protect admin page (call this on admin.html)
function protectAdminPage() {
    if (!isAuthenticated()) {
        window.location.href = 'admin-login.html';
    } else {
        // Successful authentication check - allow content rendering
        document.documentElement.classList.add('authenticated');
    }
}

// Refresh session timestamp (call periodically on admin page)
function refreshSession() {
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

// Export functions for use in testing if module system exists
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        logout,
        protectAdminPage,
        refreshSession,
        logSecurityEvent,
        getFailedAttempts,
        getRemainingLockout
    };
}
