// Optimized Portfolio JavaScript - Performance & Accessibility Focused

// Utility functions
const Utils = {
    // Debounce function for performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function for scroll events
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },

    // Check if element is in viewport
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};

// Subtle particle background (respects reduced motion)
class BackgroundEffect {
    constructor() {
        this.canvas = document.getElementById('bg-particles-canvas');
        if (!this.canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.animationId = null;
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', Utils.debounce(() => this.resize(), 200));

        for (let i = 0; i < 45; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.25,
                vy: (Math.random() - 0.5) * 0.25,
                size: Math.random() * 1.5 + 0.5
            });
        }

        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    animate() {
        if (!this.ctx) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
            this.ctx.fill();
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }
}

// Hero typing subtitle
class HeroTyping {
    constructor() {
        this.el = document.getElementById('heroTyping');
        if (!this.el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            if (this.el) {
                this.el.textContent = 'Cyber Security Student';
            }
            return;
        }

        this.phrases = [
            'Network Security',
            'Ethical Hacking',
            'Digital Forensics',
            'Python Developer'
        ];
        this.phraseIndex = 0;
        this.charIndex = 0;
        this.deleting = false;
        this.type();
    }

    type() {
        const current = this.phrases[this.phraseIndex];
        const displayed = this.deleting
            ? current.substring(0, this.charIndex - 1)
            : current.substring(0, this.charIndex + 1);

        this.el.innerHTML = `${displayed}<span class="typing-cursor">|</span>`;

        if (!this.deleting && this.charIndex < current.length) {
            this.charIndex++;
            setTimeout(() => this.type(), 80);
            return;
        }

        if (this.deleting && this.charIndex > 0) {
            this.charIndex--;
            setTimeout(() => this.type(), 40);
            return;
        }

        if (!this.deleting && this.charIndex === current.length) {
            this.deleting = true;
            setTimeout(() => this.type(), 1800);
            return;
        }

        this.deleting = false;
        this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
        setTimeout(() => this.type(), 400);
    }
}

// Navigation functionality
class Navigation {
    constructor() {
        this.hamburger = document.querySelector('.hamburger');
        this.navMenu = document.querySelector('.nav-menu');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.navbar = document.querySelector('.navbar');
        
        this.init();
    }

    init() {
        this.setupMobileMenu();
        this.setupSmoothScrolling();
        this.setupActiveNavigation();
        this.setupKeyboardNavigation();
    }

    setupMobileMenu() {
        if (!this.hamburger || !this.navMenu) return;

        // Mobile menu toggle
        this.hamburger.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMobileMenu();
        });

        // Keyboard support for hamburger
        this.hamburger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleMobileMenu();
            }
        });

        // Close mobile menu when clicking on links
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navbar.contains(e.target) && this.navMenu.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }

    toggleMobileMenu() {
        const isActive = this.hamburger.classList.contains('active');
        
        if (isActive) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        this.hamburger.classList.add('active');
        this.navMenu.classList.add('active');
        this.hamburger.setAttribute('aria-expanded', 'true');
        
        // Focus first menu item for accessibility
        const firstLink = this.navMenu.querySelector('.nav-link');
        if (firstLink) {
            setTimeout(() => firstLink.focus(), 100);
        }
    }

    closeMobileMenu() {
        this.hamburger.classList.remove('active');
        this.navMenu.classList.remove('active');
        this.hamburger.setAttribute('aria-expanded', 'false');
    }

    setupSmoothScrolling() {
        this.navLinks.forEach(link => {
            if (link.getAttribute('href').startsWith('#')) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.smoothScrollToSection(link.getAttribute('href'));
                });
            }
        });
    }

    smoothScrollToSection(targetId) {
        const target = document.querySelector(targetId);
        if (!target) return;

        const navbarHeight = this.navbar.offsetHeight;
        const targetPosition = target.offsetTop - navbarHeight - 20;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });

        // Update URL without triggering scroll
        history.pushState(null, null, targetId);
    }

    setupActiveNavigation() {
        const sections = document.querySelectorAll('section[id]');
        
        const updateActiveNav = Utils.throttle(() => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 200;
                const sectionHeight = section.clientHeight;
                
                if (window.pageYOffset >= sectionTop && 
                    window.pageYOffset < sectionTop + sectionHeight) {
                    current = section.getAttribute('id');
                }
            });

            this.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        }, 100);

        window.addEventListener('scroll', updateActiveNav);
        updateActiveNav(); // Initial call
    }

    setupKeyboardNavigation() {
        // Escape key closes mobile menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.navMenu.classList.contains('active')) {
                this.closeMobileMenu();
                this.hamburger.focus();
            }
        });
    }
}

// Lazy loading and intersection observer
class LazyLoader {
    constructor() {
        this.sections = document.querySelectorAll('.section-loading');
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            // Fallback for older browsers
            this.loadAllSections();
        }
    }

    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadSection(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        this.sections.forEach(section => {
            observer.observe(section);
        });
    }

    loadSection(section) {
        section.classList.remove('section-loading');
        section.classList.add('section-loaded');
        
        // Animate skill progress bars if this is the skills section
        if (section.id === 'skills') {
            this.animateSkillBars(section);
        }
    }

    loadAllSections() {
        this.sections.forEach(section => {
            this.loadSection(section);
        });
    }

    animateSkillBars(skillsSection) {
        const progressBars = skillsSection.querySelectorAll('.skill-progress-bar');
        
        progressBars.forEach((bar, index) => {
            setTimeout(() => {
                const width = bar.style.width;
                bar.style.width = '0%';
                bar.style.transition = 'width 1.5s ease-in-out';
                
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            }, index * 200);
        });
    }
}

// Contact form functionality
class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');
        this.submitButton = null;
        this.loadingElement = null;
        this.submitText = null;
        this.rateLimitKey = 'contactFormLastSubmit';
        this.rateLimitDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.rateLimitTimer = null;
        
        if (this.form) {
            this.submitButton = this.form.querySelector('.form-submit');
            this.loadingElement = this.form.querySelector('.loading');
            this.submitText = this.form.querySelector('.submit-text');
            this.init();
        }
    }

    init() {
        this.setupFormValidation();
        this.setupFormSubmission();
        this.checkRateLimit(); // Check on page load
    }

    setupFormValidation() {
        const inputs = this.form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => {
                this.validateField(input);
            });

            // Clear errors on focus
            input.addEventListener('focus', () => {
                this.clearFieldError(input);
            });
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        // Remove existing error
        this.clearFieldError(field);

        // Required field validation
        if (field.hasAttribute('required') && !value) {
            errorMessage = `${this.getFieldLabel(fieldName)} is required`;
            isValid = false;
        }
        // Email validation
        else if (fieldName === 'email' && value && !Utils.isValidEmail(value)) {
            errorMessage = 'Please enter a valid email address';
            isValid = false;
        }
        // Message length validation
        else if (fieldName === 'message' && value && value.length < 10) {
            errorMessage = 'Message must be at least 10 characters long';
            isValid = false;
        }

        if (!isValid) {
            this.showFieldError(field, errorMessage);
        }

        return isValid;
    }

    validateForm() {
        const inputs = this.form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });

        return isValid;
    }

    showFieldError(field, message) {
        const errorElement = document.getElementById(`${field.name}Error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        field.setAttribute('aria-invalid', 'true');
        field.style.borderColor = '#ef4444';
    }

    clearFieldError(field) {
        const errorElement = document.getElementById(`${field.name}Error`);
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }
        
        field.removeAttribute('aria-invalid');
        field.style.borderColor = '';
    }

    getFieldLabel(fieldName) {
        const labelMap = {
            name: 'Name',
            email: 'Email',
            subject: 'Subject',
            message: 'Message'
        };
        return labelMap[fieldName] || fieldName;
    }

    setupFormSubmission() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault(); // Always prevent default to handle with AJAX
            
            // Check rate limit first
            if (this.isRateLimited()) {
                this.showRateLimitMessage();
                return;
            }
            
            // Check honeypot (if filled, it's a bot)
            const honeypot = this.form.querySelector('[name="honeypot"]');
            if (honeypot && honeypot.value !== '') {
                // Silent fail for bots
                console.warn('Honeypot triggered - potential bot detected');
                return;
            }
            
            // Check $_gotcha (if filled, it's a bot)
            const gotcha = this.form.querySelector('[name="$_gotcha"]');
            if (gotcha && gotcha.value !== '') {
                // Silent fail for bots
                console.warn('$_gotcha triggered - potential bot detected');
                return;
            }
            
            // Validate form
            if (!this.validateForm()) {
                return;
            }
            
            // Show loading state
            this.setLoadingState(true);
            
            try {
                // Get form data
                const formData = new FormData(this.form);
                
                // Submit to StaticForms
                const response = await fetch('https://api.staticforms.xyz/submit', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    // Set rate limit timestamp
                    this.setRateLimit();
                    
                    // Show success modal
                    showSuccessModal();
                    
                    // Reset form
                    this.form.reset();
                    
                    // Start rate limit timer
                    this.startRateLimitTimer();
                } else {
                    // Show error
                    this.showError('Failed to send message. Please try again or email me directly.');
                }
            } catch (error) {
                console.error('Form submission error:', error);
                this.showError('Network error. Please check your connection and try again.');
            } finally {
                this.setLoadingState(false);
            }
        });
    }

    // Rate limiting methods
    isRateLimited() {
        const lastSubmit = localStorage.getItem(this.rateLimitKey);
        if (!lastSubmit) return false;
        
        const timeSinceLastSubmit = Date.now() - parseInt(lastSubmit);
        return timeSinceLastSubmit < this.rateLimitDuration;
    }

    setRateLimit() {
        localStorage.setItem(this.rateLimitKey, Date.now().toString());
    }

    getRemainingTime() {
        const lastSubmit = localStorage.getItem(this.rateLimitKey);
        if (!lastSubmit) return 0;
        
        const timeSinceLastSubmit = Date.now() - parseInt(lastSubmit);
        const remainingTime = this.rateLimitDuration - timeSinceLastSubmit;
        return Math.max(0, remainingTime);
    }

    checkRateLimit() {
        if (this.isRateLimited()) {
            this.startRateLimitTimer();
        }
    }

    startRateLimitTimer() {
        const rateLimitMessage = document.getElementById('rateLimitMessage');
        const rateLimitTimer = document.getElementById('rateLimitTimer');
        
        if (!rateLimitMessage || !rateLimitTimer) return;
        
        // Show rate limit message
        rateLimitMessage.style.display = 'flex';
        this.submitButton.disabled = true;
        
        // Clear existing timer
        if (this.rateLimitTimer) {
            clearInterval(this.rateLimitTimer);
        }
        
        // Update timer every second
        this.rateLimitTimer = setInterval(() => {
            const remaining = this.getRemainingTime();
            
            if (remaining <= 0) {
                // Rate limit expired
                clearInterval(this.rateLimitTimer);
                rateLimitMessage.style.display = 'none';
                this.submitButton.disabled = false;
                return;
            }
            
            // Format time as MM:SS
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            rateLimitTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        // Initial update
        const remaining = this.getRemainingTime();
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        rateLimitTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    showRateLimitMessage() {
        const rateLimitMessage = document.getElementById('rateLimitMessage');
        if (rateLimitMessage) {
            rateLimitMessage.style.display = 'flex';
            
            // Scroll to message
            rateLimitMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    setLoadingState(isLoading) {
        if (isLoading) {
            this.submitButton.disabled = true;
            this.submitText.style.display = 'none';
            this.loadingElement.style.display = 'inline-block';
        } else {
            this.submitButton.disabled = false;
            this.submitText.style.display = 'inline';
            this.loadingElement.style.display = 'none';
        }
    }

    showSuccess() {
        const successElement = document.getElementById('successMessage');
        if (successElement) {
            successElement.style.display = 'block';
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 5000);
        }
    }

    showError(message) {
        // Create or update error message
        let errorElement = this.form.querySelector('.form-error');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error form-error';
            this.form.appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    }
}

// Scroll to top functionality
class ScrollToTop {
    constructor() {
        this.button = null;
        this.createButton();
        this.init();
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.className = 'scroll-to-top';
        this.button.innerHTML = '<i class="fas fa-chevron-up"></i>';
        this.button.setAttribute('aria-label', 'Scroll to top');
        this.button.setAttribute('title', 'Scroll to top');
        
        document.body.appendChild(this.button);
    }

    init() {
        this.button.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Show/hide button based on scroll position
        const toggleButton = Utils.throttle(() => {
            if (window.pageYOffset > 300) {
                this.button.classList.add('visible');
            } else {
                this.button.classList.remove('visible');
            }
        }, 100);

        window.addEventListener('scroll', toggleButton);
    }
}

// Performance monitoring
class PerformanceMonitor {
    constructor() {
        this.init();
    }

    init() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            if ('performance' in window) {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('Page Load Performance:', {
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domReady: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    totalTime: perfData.loadEventEnd - perfData.fetchStart
                });
            }
        });

        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn('Long task detected:', entry.duration + 'ms');
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // PerformanceObserver not supported
            }
        }
    }
}

// Error handling
class ErrorHandler {
    constructor() {
        this.init();
    }

    init() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('JavaScript Error:', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                error: e.error
            });
            
            // Don't show error to user in production
            if (window.location.hostname === 'localhost') {
                this.showErrorToUser('A JavaScript error occurred. Check console for details.');
            }
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled Promise Rejection:', e.reason);
            
            if (window.location.hostname === 'localhost') {
                this.showErrorToUser('An async operation failed. Check console for details.');
            }
        });
    }

    showErrorToUser(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Accessibility enhancements
class AccessibilityEnhancer {
    constructor() {
        this.init();
    }

    init() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupARIALabels();
        this.setupReducedMotion();
    }

    setupKeyboardNavigation() {
        // Add main landmark if not present
        const mainContent = document.querySelector('main') || document.querySelector('.hero');
        if (mainContent && !mainContent.id) {
            mainContent.id = 'main';
        }
    }

    setupFocusManagement() {
        // Ensure all interactive elements are focusable
        const interactiveElements = document.querySelectorAll('button, a, input, textarea, select');
        
        interactiveElements.forEach(element => {
            if (!element.hasAttribute('tabindex') && element.tabIndex < 0) {
                element.tabIndex = 0;
            }
        });

        // Focus trap for mobile menu
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.addEventListener('keydown', (e) => {
                if (e.key === 'Tab' && navMenu.classList.contains('active')) {
                    const focusableElements = navMenu.querySelectorAll('a, button');
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];

                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            });
        }
    }

    setupARIALabels() {
        // Add ARIA labels where missing
        const socialLinks = document.querySelectorAll('.social-link');
        socialLinks.forEach(link => {
            if (!link.getAttribute('aria-label')) {
                const icon = link.querySelector('i');
                if (icon) {
                    const classList = Array.from(icon.classList);
                    let label = 'Social link';
                    
                    if (classList.includes('fa-envelope')) label = 'Email';
                    else if (classList.includes('fa-linkedin-in')) label = 'LinkedIn';
                    else if (classList.includes('fa-github')) label = 'GitHub';
                    
                    link.setAttribute('aria-label', label);
                }
            }
        });

        // Add role attributes where needed
        const cards = document.querySelectorAll('.card, .skill-item, .project-card');
        cards.forEach(card => {
            if (!card.getAttribute('role')) {
                card.setAttribute('role', 'article');
            }
        });
    }

    setupReducedMotion() {
        // Respect user's motion preferences
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const handleMotionChange = (e) => {
            if (e.matches) {
                document.body.classList.add('reduce-motion');
            } else {
                document.body.classList.remove('reduce-motion');
            }
        };

        mediaQuery.addListener(handleMotionChange);
        handleMotionChange(mediaQuery);
    }
}

// Service Worker registration for offline functionality
class ServiceWorkerManager {
    constructor() {
        this.init();
    }

    init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                this.registerServiceWorker();
            });
        }
    }

    async registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registered successfully:', registration.scope);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }
}

// Gallery functionality
class Gallery {
    constructor() {
        this.cloudName = 'ds1gqtuf2';
        this.galleryGrid = document.getElementById('galleryGrid');
        this.lightbox = null;
        
        // Hardcoded image list - UPDATE THIS ARRAY when you upload new images
        // Get public_id from admin page after uploading
        this.images = [
            // Example: { public_id: 'sample', format: 'jpg' }
            // Add your uploaded images here
        ];
        
        this.init();
    }

    init() {
        if (this.galleryGrid) {
            this.createLightbox();
            this.loadImages();
        }
    }

    createLightbox() {
        this.lightbox = document.createElement('div');
        this.lightbox.className = 'lightbox';
        this.lightbox.innerHTML = `
            <button class="lightbox-close" aria-label="Close lightbox">
                <i class="fas fa-times"></i>
            </button>
            <div class="lightbox-content">
                <img src="" alt="Gallery image">
            </div>
        `;
        document.body.appendChild(this.lightbox);

        // Close lightbox on click
        this.lightbox.addEventListener('click', (e) => {
            if (e.target === this.lightbox || e.target.closest('.lightbox-close')) {
                this.closeLightbox();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.lightbox.classList.contains('active')) {
                this.closeLightbox();
            }
        });
    }

    async loadImages() {
        // Check if we have hardcoded images
        if (this.images.length > 0) {
            // Reverse to show latest first
            const reversedImages = [...this.images].reverse();
            this.displayImages(reversedImages);
            return;
        }
        
        // If no hardcoded images, try fetching from Cloudinary
        try {
            const url = `https://res.cloudinary.com/${this.cloudName}/image/list/ashish.json?cb=${Date.now()}`;
            const response = await fetch(url);
            
            if (response.ok) {
                const data = await response.json();
                let resources = data.resources || [];
                
                if (resources.length > 0) {
                    // Sort by created_at date to show latest first
                    resources.sort((a, b) => {
                        const dateA = new Date(a.created_at || 0);
                        const dateB = new Date(b.created_at || 0);
                        return dateB - dateA; // Descending order (newest first)
                    });
                    
                    this.displayImages(resources);
                    return;
                }
            }
        } catch (error) {
            // Silently fail and show empty state
        }
        
        // Show empty state
        this.showEmptyState();
    }

    displayImages(images) {
        this.galleryGrid.innerHTML = '';

        images.forEach((image) => {
            const publicId = image.public_id;
            const format = image.format;
            
            // Optimized Cloudinary URLs
            const thumbUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/w_261,h_348,c_fill,f_auto,q_auto/${publicId}.${format}`;
            const fullUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload/f_auto,q_auto/${publicId}.${format}`;

            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.innerHTML = `
                <img src="${thumbUrl}" alt="Gallery image" loading="lazy">
            `;

            galleryItem.addEventListener('click', () => {
                this.openLightbox(fullUrl);
            });

            this.galleryGrid.appendChild(galleryItem);
        });
    }

    openLightbox(imageUrl) {
        const img = this.lightbox.querySelector('img');
        img.src = imageUrl;
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeLightbox() {
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    showEmptyState() {
        this.galleryGrid.innerHTML = `
            <div class="gallery-loading">
                <i class="fas fa-images"></i>
                <p>No images found in gallery</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">
                    Upload images from the <a href="admin.html" style="color: var(--primary-color); text-decoration: underline;">admin page</a>
                </p>
                <p style="font-size: 0.85rem; margin-top: 0.5rem; color: var(--text-secondary);">
                    After uploading, add image details to the gallery array in script.js
                </p>
            </div>
        `;
    }
}

// Main application initialization
class PortfolioApp {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeComponents();
            });
        } else {
            this.initializeComponents();
        }

        // Initialize error handling first
        new ErrorHandler();
    }

    initializeComponents() {
        try {
            // Initialize all components
            new Navigation();
            new BackgroundEffect();
            new HeroTyping();
            new LazyLoader();
            new ContactForm();
            new ScrollToTop();
            new AccessibilityEnhancer();
            new PerformanceMonitor();
            new ServiceWorkerManager();
            new Gallery();
            new ProjectsCarousel();

            console.log('✅ Portfolio website initialized successfully!');
            console.log('🚀 Optimized for performance and accessibility');
            
        } catch (error) {
            console.error('❌ Error initializing portfolio components:', error);
        }
    }
}

// Initialize the application
new PortfolioApp();

// Success Modal Functions
function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Close on escape key
        document.addEventListener('keydown', handleEscapeKey);
        
        // Close on overlay click
        modal.addEventListener('click', handleOverlayClick);
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Remove event listeners
        document.removeEventListener('keydown', handleEscapeKey);
        modal.removeEventListener('click', handleOverlayClick);
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeSuccessModal();
    }
}

function handleOverlayClick(e) {
    if (e.target.id === 'successModal') {
        closeSuccessModal();
    }
}

// Projects Carousel Logic
class ProjectsCarousel {
    constructor() {
        this.grid = document.querySelector('.projects-grid');
        this.cards = document.querySelectorAll('.project-card');
        if (!this.grid || this.cards.length === 0) return;
        
        this.init();
    }
    
    init() {
        this.updateCards();
        this.grid.addEventListener('scroll', Utils.throttle(() => this.updateCards(), 50));
        window.addEventListener('resize', Utils.debounce(() => this.updateCards(), 100));
        
        // Initial setup delay
        setTimeout(() => {
            // Scroll to the second item by default if possible
            if (this.cards.length > 1) {
                const scrollLeft = this.cards[1].offsetLeft - this.grid.clientWidth / 2 + this.cards[1].clientWidth / 2;
                this.grid.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
            this.updateCards();
        }, 100);
    }
    
    updateCards() {
        if (!this.grid) return;
        const gridRect = this.grid.getBoundingClientRect();
        const gridCenter = gridRect.left + gridRect.width / 2;
        
        this.cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + cardRect.width / 2;
            const distance = Math.abs(gridCenter - cardCenter);
            
            card.classList.remove('active', 'adjacent');
            
            const cardWidth = cardRect.width;
            
            if (distance < cardWidth * 0.6) {
                card.classList.add('active');
            } else if (distance < cardWidth * 1.6) {
                card.classList.add('adjacent');
            }
        });
    }
}
