// Main JavaScript functionality for Deli Spi
(function() {
    'use strict';

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeApp();
    });

    function initializeApp() {
        initializeNavigation();
        initializeAlerts();
        initializeForms();
        initializeTooltips();
        initializeModals();
        updateCartBadge();
    }

    // Navigation functionality
    function initializeNavigation() {
        // Highlight current page in navigation
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        
        navLinks.forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Mobile menu auto-close
        const navbarToggler = document.querySelector('.navbar-toggler');
        const navbarCollapse = document.querySelector('.navbar-collapse');
        
        if (navbarToggler && navbarCollapse) {
            document.addEventListener('click', function(e) {
                if (!navbarToggler.contains(e.target) && !navbarCollapse.contains(e.target)) {
                    const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                    if (bsCollapse) {
                        bsCollapse.hide();
                    }
                }
            });
        }
    }

    // Alert functionality
    function initializeAlerts() {
        // Auto-dismiss alerts after 5 seconds
        const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
        alerts.forEach(alert => {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }, 5000);
        });
    }

    // Form enhancements
    function initializeForms() {
        // Add loading states to form submissions
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.classList.add('loading');
                    submitBtn.disabled = true;
                    
                    // Re-enable button after 10 seconds as fallback
                    setTimeout(() => {
                        submitBtn.classList.remove('loading');
                        submitBtn.disabled = false;
                    }, 10000);
                }
            });
        });

        // Real-time form validation feedback
        const inputs = document.querySelectorAll('.form-control, .form-select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                validateInput(this);
            });
        });

        // Password strength indicator
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input.name === 'password' || input.name === 'new_password') {
                input.addEventListener('input', function() {
                    showPasswordStrength(this);
                });
            }
        });
    }

    // Validate individual form input
    function validateInput(input) {
        const feedback = input.parentNode.querySelector('.invalid-feedback');
        
        if (input.checkValidity()) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
        }
    }

    // Password strength indicator
    function showPasswordStrength(input) {
        const password = input.value;
        let strengthDiv = input.parentNode.querySelector('.password-strength');
        
        if (!strengthDiv) {
            strengthDiv = document.createElement('div');
            strengthDiv.className = 'password-strength mt-1';
            input.parentNode.appendChild(strengthDiv);
        }

        const strength = calculatePasswordStrength(password);
        strengthDiv.innerHTML = `
            <div class="progress" style="height: 4px;">
                <div class="progress-bar bg-${strength.color}" 
                     style="width: ${strength.percentage}%"></div>
            </div>
            <small class="text-${strength.color}">${strength.text}</small>
        `;
    }

    // Calculate password strength
    function calculatePasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const strengths = [
            { color: 'danger', text: 'Very Weak', percentage: 20 },
            { color: 'danger', text: 'Weak', percentage: 40 },
            { color: 'warning', text: 'Fair', percentage: 60 },
            { color: 'info', text: 'Good', percentage: 80 },
            { color: 'success', text: 'Strong', percentage: 100 }
        ];

        return strengths[Math.min(score, 4)];
    }

    // Initialize tooltips
    function initializeTooltips() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(tooltipTriggerEl => {
            new bootstrap.Tooltip(tooltipTriggerEl);
        });
    }

    // Initialize modals
    function initializeModals() {
        // Close modal on successful form submission
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.addEventListener('shown.bs.modal', function() {
                const firstInput = modal.querySelector('input, select, textarea');
                if (firstInput) {
                    firstInput.focus();
                }
            });
        });
    }

    // Update cart badge in navigation
    function updateCartBadge() {
        const cartBadge = document.querySelector('.navbar .badge');
        if (cartBadge) {
            fetch('/products/cart-count')
                .then(response => response.json())
                .then(data => {
                    if (data.count > 0) {
                        cartBadge.textContent = data.count;
                        cartBadge.style.display = 'inline';
                    } else {
                        cartBadge.style.display = 'none';
                    }
                })
                .catch(error => {
                    console.log('Cart count update failed:', error);
                });
        }
    }

    // Utility functions
    window.DelispUtils = {
        showToast: function(message, type = 'info') {
            const toastContainer = document.getElementById('toast-container') || createToastContainer();
            const toast = createToast(message, type);
            toastContainer.appendChild(toast);
            
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
            
            toast.addEventListener('hidden.bs.toast', function() {
                toast.remove();
            });
        },

        confirmAction: function(message, callback) {
            if (confirm(message)) {
                callback();
            }
        },

        formatPrice: function(price) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(price);
        },

        debounce: function(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    // Create toast container if it doesn't exist
    function createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
        return container;
    }

    // Create toast element
    function createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="toast-header">
                <i data-feather="${getToastIcon(type)}" class="text-${type} me-2"></i>
                <strong class="me-auto">Deli Spi</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body">${message}</div>
        `;
        
        // Initialize feather icons in the toast
        setTimeout(() => {
            if (window.feather) {
                feather.replace();
            }
        }, 10);
        
        return toast;
    }

    // Get appropriate icon for toast type
    function getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            danger: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || 'info';
    }

    // Search functionality
    window.addEventListener('load', function() {
        const searchForm = document.querySelector('.search-form');
        if (searchForm) {
            const searchInput = searchForm.querySelector('input[name="search"]');
            if (searchInput) {
                const debouncedSearch = DelispUtils.debounce(function() {
                    if (searchInput.value.length >= 3) {
                        searchForm.submit();
                    }
                }, 500);
                
                searchInput.addEventListener('input', debouncedSearch);
            }
        }
    });

})();
