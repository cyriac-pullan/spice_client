from flask import Blueprint, render_template, request, redirect, url_for, flash, session, jsonify
from flask_login import login_required, current_user
from models import Product, Category
from utils.helpers import get_cart_items, add_to_cart, update_cart_item, remove_from_cart

products_bp = Blueprint('products', __name__)

@products_bp.route('/')
def products():
    page = request.args.get('page', 1, type=int)
    category = request.args.get('category')
    search = request.args.get('search')
    
    per_page = 12
    offset = (page - 1) * per_page
    
    products = Product.get_all(category=category, search=search, limit=per_page, offset=offset)
    categories = Category.get_all()
    
    return render_template('products.html', 
                         products=products, 
                         categories=categories,
                         selected_category=category,
                         search_query=search,
                         page=page)

@products_bp.route('/<product_id>')
def product_detail(product_id):
    product = Product.get_by_id(product_id)
    if not product:
        flash('Product not found.', 'error')
        return redirect(url_for('products.products'))
    
    # Get related products from same category
    related_products = Product.get_all(category=product.category_id, limit=4)
    related_products = [p for p in related_products if p.id != product.id]
    
    return render_template('product_detail.html', 
                         product=product, 
                         related_products=related_products)

@products_bp.route('/add-to-cart', methods=['POST'])
def add_to_cart_route():
    product_id = request.form.get('product_id')
    quantity = int(request.form.get('quantity', 1))
    
    product = Product.get_by_id(product_id)
    if not product:
        flash('Product not found.', 'error')
        return redirect(url_for('products.products'))
    
    if quantity > product.stock_quantity:
        flash('Not enough stock available.', 'error')
        return redirect(url_for('products.product_detail', product_id=product_id))
    
    add_to_cart(product_id, quantity)
    flash(f'{product.name} added to cart!', 'success')
    
    return redirect(url_for('products.product_detail', product_id=product_id))

@products_bp.route('/cart')
def cart():
    cart_items = get_cart_items()
    total = sum(item['subtotal'] for item in cart_items)
    return render_template('cart.html', cart_items=cart_items, total=total)

@products_bp.route('/update-cart', methods=['POST'])
def update_cart():
    product_id = request.form.get('product_id')
    quantity = int(request.form.get('quantity', 0))
    
    if quantity <= 0:
        remove_from_cart(product_id)
        flash('Item removed from cart.', 'info')
    else:
        product = Product.get_by_id(product_id)
        if product and quantity <= product.stock_quantity:
            update_cart_item(product_id, quantity)
            flash('Cart updated.', 'success')
        else:
            flash('Invalid quantity or insufficient stock.', 'error')
    
    return redirect(url_for('products.cart'))

@products_bp.route('/remove-from-cart/<product_id>')
def remove_from_cart_route(product_id):
    remove_from_cart(product_id)
    flash('Item removed from cart.', 'info')
    return redirect(url_for('products.cart'))

@products_bp.route('/wishlist/add/<product_id>')
@login_required
def add_to_wishlist(product_id):
    product = Product.get_by_id(product_id)
    if product:
        current_user.add_to_wishlist(product_id)
        flash(f'{product.name} added to wishlist!', 'success')
    else:
        flash('Product not found.', 'error')
    
    return redirect(url_for('products.product_detail', product_id=product_id))

@products_bp.route('/wishlist/remove/<product_id>')
@login_required
def remove_from_wishlist(product_id):
    current_user.remove_from_wishlist(product_id)
    flash('Item removed from wishlist.', 'info')
    return redirect(url_for('main.profile'))
