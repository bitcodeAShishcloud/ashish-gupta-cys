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
        this.form.addEventListener('submit', (e) => {
            // Only prevent default if validation fails
            if (!this.validateForm()) {
                e.preventDefault();
                return;
            }
            
            // Show loading state but allow form to submit to FormSubmit.co
            this.setLoadingState(true);
            
            // Form will submit normally to FormSubmit.co
            // FormSubmit.co will handle the redirect
        });
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
        // Skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 10000;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);

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
            new LazyLoader();
            new ContactForm();
            new ScrollToTop();
            new AccessibilityEnhancer();
            new PerformanceMonitor();
            new ServiceWorkerManager();

            console.log('✅ Portfolio website initialized successfully!');
            console.log('🚀 Optimized for performance and accessibility');
            
        } catch (error) {
            console.error('❌ Error initializing portfolio components:', error);
        }
    }
}

// Initialize the application
new PortfolioApp();
