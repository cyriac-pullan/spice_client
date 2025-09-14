// Cart functionality for Deli Spi
(function() {
    'use strict';

    // Initialize cart functionality when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initializeCart();
    });

    function initializeCart() {
        bindCartEvents();
        updateCartTotals();
        initializeQuantityControls();
        initializeCartStorage();
    }

    // Bind cart-related events
    function bindCartEvents() {
        // Add to cart buttons
        const addToCartBtns = document.querySelectorAll('form[action*="add-to-cart"]');
        addToCartBtns.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                addToCart(this);
            });
        });

        // Remove from cart buttons
        const removeButtons = document.querySelectorAll('a[href*="remove-from-cart"]');
        removeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                removeFromCart(this);
            });
        });

        // Update cart forms
        const updateForms = document.querySelectorAll('form[action*="update-cart"]');
        updateForms.forEach(form => {
            const select = form.querySelector('select[name="quantity"]');
            if (select) {
                select.addEventListener('change', function() {
                    updateCartItem(form);
                });
            }
        });

        // Wishlist buttons
        const wishlistButtons = document.querySelectorAll('a[href*="wishlist"]');
        wishlistButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                toggleWishlist(this);
            });
        });
    }

    // Add item to cart
    function addToCart(form) {
        const formData = new FormData(form);
        const submitBtn = form.querySelector('button[type="submit"]');
        
        // Show loading state
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        }

        fetch(form.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                return response.text();
            }
            throw new Error('Network response was not ok');
        })
        .then(data => {
            // Show success message
            const productName = form.closest('.card').querySelector('.card-title')?.textContent || 'Item';
            DelispUtils.showToast(`${productName} added to cart!`, 'success');
            
            // Update cart badge
            updateCartBadge();
            
            // Update button text temporarily
            if (submitBtn) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i data-feather="check" size="16"></i> Added!';
                feather.replace();
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    feather.replace();
                }, 2000);
            }
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            DelispUtils.showToast('Failed to add item to cart', 'danger');
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.classList.remove('loading');
                submitBtn.disabled = false;
            }
        });
    }

    // Remove item from cart
    function removeFromCart(button) {
        // Use data-product-id for precise targeting
        let cartItem = button.closest('[data-product-id]');
        if (!cartItem) {
            cartItem = button.closest('.card, tr');
        }
        const productName = cartItem.querySelector('.card-title, td strong')?.textContent || 'Item';
        
        DelispUtils.confirmAction(`Remove ${productName} from cart?`, function() {
            // Add removing animation
            if (cartItem) {
                cartItem.classList.add('removing');
            }

            fetch(button.href, {
                method: 'GET'
            })
            .then(response => {
                if (response.ok) {
                    // Remove item from DOM
                    if (cartItem) {
                        // Try to get quantity before removal
                        let qty = 1;
                        const quantityElement = cartItem.querySelector('select[name="quantity"], .quantity-input');
                        if (quantityElement) {
                            qty = parseInt(quantityElement.value) || 1;
                        }
                        cartItem.style.transition = 'opacity 0.3s ease-out';
                        cartItem.style.opacity = '0';
                        setTimeout(() => {
                            cartItem.remove();
                            updateCartTotals();
                            checkEmptyCart();
                        }, 300);
                        // Decrement sessionCartCount for instant badge update
                        if (window.sessionCartCount !== undefined) {
                            window.sessionCartCount = Math.max(0, window.sessionCartCount - qty);
                        }
                    }
                    DelispUtils.showToast(`${productName} removed from cart`, 'info');
                    updateCartBadge();
                } else {
                    throw new Error('Failed to remove item');
                }
            })
            .catch(error => {
                console.error('Error removing from cart:', error);
                DelispUtils.showToast('Failed to remove item from cart', 'danger');
                
                // Remove animation class on error
                if (cartItem) {
                    cartItem.classList.remove('removing');
                }
            });
        });
    }

    // Update cart item quantity
    function updateCartItem(form) {
        const formData = new FormData(form);
        const quantity = formData.get('quantity');
        const cartItem = form.closest('.card, tr');
        
        if (quantity === '0') {
            const removeButton = cartItem.querySelector('a[href*="remove-from-cart"]');
            if (removeButton) {
                removeFromCart(removeButton);
                return;
            }
        }

        fetch(form.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                DelispUtils.showToast('Cart updated', 'success');
                updateCartTotals();
                updateCartBadge();
            } else {
                throw new Error('Failed to update cart');
            }
        })
        .catch(error => {
            console.error('Error updating cart:', error);
            DelispUtils.showToast('Failed to update cart', 'danger');
        });
    }

    // Toggle wishlist
    function toggleWishlist(button) {
        const isAdding = button.href.includes('add');
        const productName = button.closest('.card').querySelector('.card-title')?.textContent || 'Item';
        
        fetch(button.href, {
            method: 'GET'
        })
        .then(response => {
            if (response.ok) {
                // Update button appearance
                if (isAdding) {
                    button.innerHTML = '<i data-feather="heart" fill="currentColor" size="16"></i> Remove from Wishlist';
                    button.href = button.href.replace('/add/', '/remove/');
                    button.classList.remove('btn-outline-secondary');
                    button.classList.add('btn-secondary');
                    DelispUtils.showToast(`${productName} added to wishlist!`, 'success');
                } else {
                    button.innerHTML = '<i data-feather="heart" size="16"></i> Add to Wishlist';
                    button.href = button.href.replace('/remove/', '/add/');
                    button.classList.remove('btn-secondary');
                    button.classList.add('btn-outline-secondary');
                    DelispUtils.showToast(`${productName} removed from wishlist`, 'info');
                }
                feather.replace();
            } else {
                throw new Error('Failed to update wishlist');
            }
        })
        .catch(error => {
            console.error('Error updating wishlist:', error);
            DelispUtils.showToast('Failed to update wishlist', 'danger');
        });
    }

    // Initialize quantity controls
    function initializeQuantityControls() {
        const quantityInputs = document.querySelectorAll('.quantity-input');
        quantityInputs.forEach(input => {
            // Add plus/minus buttons if they don't exist
            if (!input.parentNode.querySelector('.quantity-btn')) {
                addQuantityButtons(input);
            }
        });
    }

    // Add quantity increment/decrement buttons
    function addQuantityButtons(input) {
        const wrapper = document.createElement('div');
        wrapper.className = 'input-group quantity-control';
        
        const minusBtn = document.createElement('button');
        minusBtn.className = 'btn btn-outline-secondary quantity-btn';
        minusBtn.type = 'button';
        minusBtn.innerHTML = '<i data-feather="minus" size="14"></i>';
        
        const plusBtn = document.createElement('button');
        plusBtn.className = 'btn btn-outline-secondary quantity-btn';
        plusBtn.type = 'button';
        plusBtn.innerHTML = '<i data-feather="plus" size="14"></i>';
        
        // Wrap input with new structure
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(minusBtn);
        wrapper.appendChild(input);
        wrapper.appendChild(plusBtn);
        
        // Add event listeners
        minusBtn.addEventListener('click', function() {
            const currentValue = parseInt(input.value) || 0;
            if (currentValue > 1) {
                input.value = currentValue - 1;
                input.dispatchEvent(new Event('change'));
            }
        });
        
        plusBtn.addEventListener('click', function() {
            const currentValue = parseInt(input.value) || 0;
            const maxValue = parseInt(input.getAttribute('max')) || 99;
            if (currentValue < maxValue) {
                input.value = currentValue + 1;
                input.dispatchEvent(new Event('change'));
            }
        });
        
        feather.replace();
    }

    // Update cart totals
    function updateCartTotals() {
        const cartItems = document.querySelectorAll('.cart-item, .card[data-product-id]');
        let subtotal = 0;
        
        cartItems.forEach(item => {
            const priceElement = item.querySelector('.item-price, .fw-bold');
            const quantityElement = item.querySelector('select[name="quantity"], .quantity-input');
            
            if (priceElement && quantityElement) {
                const price = parseFloat(priceElement.textContent.replace('$', ''));
                const quantity = parseInt(quantityElement.value) || 0;
                subtotal += price * quantity;
            }
        });
        
        // Update subtotal display
        const subtotalElement = document.querySelector('.cart-subtotal');
        if (subtotalElement) {
            subtotalElement.textContent = DelispUtils.formatPrice(subtotal);
        }
        
        // Calculate and update total
        const shipping = 5.99;
        const tax = subtotal * 0.08;
        const total = subtotal + shipping + tax;
        
        const totalElement = document.querySelector('.cart-total');
        if (totalElement) {
            totalElement.textContent = DelispUtils.formatPrice(total);
        }
    }

    // Check if cart is empty and show appropriate message
    function checkEmptyCart() {
        const cartItems = document.querySelectorAll('.cart-item, .card[data-product-id]');
        if (cartItems.length === 0) {
            const cartContainer = document.querySelector('.cart-container, .row');
            if (cartContainer) {
                cartContainer.innerHTML = `
                    <div class="col-12">
                        <div class="text-center py-5">
                            <i data-feather="shopping-cart" size="64" class="text-muted mb-3"></i>
                            <h3>Your cart is empty</h3>
                            <p class="text-muted">Add some delicious spices to get started!</p>
                            <a href="/products" class="btn btn-primary">Shop Now</a>
                        </div>
                    </div>
                `;
                feather.replace();
            }
        }
    }

    // Update cart badge in navigation
    function updateCartBadge() {
        const cartBadge = document.querySelector('.navbar .badge');
        if (!cartBadge) return;
        // Always fetch latest count from backend
        fetch('/products/cart-count')
            .then(response => response.json())
            .then(data => {
                if (data.count > 0) {
                    cartBadge.textContent = data.count;
                    cartBadge.style.display = 'inline';
                } else {
                    cartBadge.textContent = '';
                    cartBadge.style.display = 'none';
                }
            })
            .catch(error => {
                cartBadge.textContent = '';
                cartBadge.style.display = 'none';
            });
    }

    // Initialize cart storage (for persistence across page loads)
    function initializeCartStorage() {
        // Save cart state to localStorage
        const saveCartState = DelispUtils.debounce(function() {
            const cartState = {};
            const cartItems = document.querySelectorAll('.cart-item, .card[data-product-id]');
            
            cartItems.forEach(item => {
                const productId = item.dataset.productId;
                const quantityElement = item.querySelector('select[name="quantity"], .quantity-input');
                
                if (productId && quantityElement) {
                    cartState[productId] = parseInt(quantityElement.value) || 0;
                }
            });
            
            localStorage.setItem('deli_spi_cart', JSON.stringify(cartState));
        }, 1000);
        
        // Listen for quantity changes
        document.addEventListener('change', function(e) {
            if (e.target.matches('select[name="quantity"], .quantity-input')) {
                saveCartState();
            }
        });
    }

    // Quick add to cart (for product listings)
    window.quickAddToCart = function(productId, productName) {
        const formData = new FormData();
        formData.append('product_id', productId);
        formData.append('quantity', '1');
        
        fetch('/products/add-to-cart', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                DelispUtils.showToast(`${productName} added to cart!`, 'success');
                updateCartBadge();
            } else {
                throw new Error('Failed to add to cart');
            }
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            DelispUtils.showToast('Failed to add item to cart', 'danger');
        });
    };

})();
