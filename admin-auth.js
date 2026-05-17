// Admin Authentication System with SHA-256 Hashing
// Credentials are hashed for security

const AUTH_CONFIG = {
    // Hashed credentials (SHA-256)
    // Username: admin
    // Password: Purple-Panda-99-Skating!
    usernameHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 of 'admin'
    passwordHash: '48c0be548f4c42613938ad25af203e17261ed0449c9f441fd906f9e7833aef98', // SHA-256 of 'Purple-Panda-99-Skating!'
    sessionKey: 'admin_authenticated',
    sessionTimeout: 3600000 // 1 hour in milliseconds
};

// SHA-256 hash function
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const togglePassword = document.getElementById('togglePassword');

    // Toggle password visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Handle form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            // Validate inputs
            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            // Show loading state
            loginBtn.classList.add('loading');
            loginBtn.disabled = true;
            hideError();

            // Simulate authentication delay (remove in production)
            setTimeout(async () => {
                await authenticateUser(username, password);
            }, 800);
        });
    }

    // Auto-focus username field
    if (usernameInput) {
        usernameInput.focus();
    }
});

// Authenticate user with hashed credentials
async function authenticateUser(username, password) {
    const loginBtn = document.getElementById('loginBtn');
    
    try {
        // Hash the input credentials
        const usernameHashInput = await sha256(username);
        const passwordHashInput = await sha256(password);
        
        // Compare hashes
        if (usernameHashInput === AUTH_CONFIG.usernameHash && 
            passwordHashInput === AUTH_CONFIG.passwordHash) {
            
            // Create session
            const session = {
                authenticated: true,
                timestamp: Date.now(),
                username: username
            };
            
            // Store session
            localStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(session));
            
            // Show success and redirect
            showSuccess('Login successful! Redirecting...');
            
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            // Authentication failed
            loginBtn.classList.remove('loading');
            loginBtn.disabled = false;
            showError('Invalid username or password');
            
            // Clear password field
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    } catch (error) {
        console.error('Authentication error:', error);
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        showError('Authentication error. Please try again.');
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
    localStorage.removeItem(AUTH_CONFIG.sessionKey);
    window.location.href = 'admin-login.html';
}

// Show error message
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            hideError();
        }, 5000);
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
        errorMessage.style.background = '#d1fae5';
        errorMessage.style.color = '#065f46';
        errorMessage.style.borderColor = '#6ee7b7';
        errorText.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
        errorMessage.style.display = 'block';
    }
}

// Protect admin page (call this on admin.html)
function protectAdminPage() {
    if (!isAuthenticated()) {
        window.location.href = 'admin-login.html';
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

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        logout,
        protectAdminPage,
        refreshSession
    };
}
