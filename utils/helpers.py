from flask import session
from models import Product

def get_cart_items():
    """Get cart items with product details"""
    cart = session.get('cart', {})
    cart_items = []
    
    for product_id, quantity in cart.items():
        try:
            product = Product.query.get(int(product_id))
            if product and product.status == 'active':
                cart_items.append({
                    'product': product,
                    'quantity': quantity,
                    'subtotal': float(product.price) * quantity
                })
        except (ValueError, TypeError):
            # Remove invalid product from cart
            pass
    
    return cart_items

def add_to_cart(product_id, quantity=1):
    """Add product to cart"""
    if 'cart' not in session:
        session['cart'] = {}
    
    if product_id in session['cart']:
        session['cart'][product_id] += quantity
    else:
        session['cart'][product_id] = quantity
    
    session.modified = True

def update_cart_item(product_id, quantity):
    """Update quantity of item in cart"""
    if 'cart' in session and product_id in session['cart']:
        session['cart'][product_id] = quantity
        session.modified = True

def remove_from_cart(product_id):
    """Remove item from cart"""
    if 'cart' in session and product_id in session['cart']:
        del session['cart'][product_id]
        session.modified = True

def clear_cart():
    """Clear all items from cart"""
    session.pop('cart', None)

def get_cart_count():
    """Get total number of items in cart"""
    cart = session.get('cart', {})
    return sum(cart.values())
