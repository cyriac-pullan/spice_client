from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from functools import wraps
from models import Product, Category, Order, User
from forms import ProductForm, CategoryForm
from sqlalchemy import func
from extensions import db

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            flash('Admin access required.', 'error')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function

@admin_bp.route('/')
@login_required
@admin_required
def dashboard():
    # Get dashboard statistics
    total_orders = Order.query.count()
    total_revenue = db.session.query(func.sum(Order.total_amount)).scalar() or 0
    total_users = User.query.count()
    total_products = Product.query.count()
    
    # Get recent orders
    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()
    
    stats = {
        'total_orders': total_orders,
        'total_revenue': float(total_revenue),
        'total_users': total_users,
        'total_products': total_products
    }
    
    return render_template('admin/dashboard.html', stats=stats, recent_orders=recent_orders)

@admin_bp.route('/products')
@login_required
@admin_required
def products():
    products = Product.get_admin_products()
    form = ProductForm()
    
    # Populate category choices
    categories = Category.get_all()
    form.category.choices = [(str(cat.id), cat.name) for cat in categories]
    
    return render_template('admin/products.html', products=products, form=form)

@admin_bp.route('/products/new', methods=['GET', 'POST'])
@login_required
@admin_required
def new_product():
    form = ProductForm()
    categories = Category.get_all()
    form.category.choices = [(str(c.id), c.name) for c in categories]
    
    if form.validate_on_submit():
        try:
            product = Product.create_product(
                name=form.name.data,
                description=form.description.data,
                price=form.price.data,
                category_id=int(form.category.data),
                stock_quantity=form.stock_quantity.data,
                sku=form.sku.data,
                image=form.image.data
            )
            flash('Product created successfully!', 'success')
            return redirect(url_for('admin.products'))
        except Exception as e:
            flash(f'Error creating product: {str(e)}', 'error')
    
    return render_template('admin/product_form.html', form=form, title='New Product')

@admin_bp.route('/products/<int:product_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_product(product_id):
    product = Product.query.get_or_404(product_id)
    
    form = ProductForm(obj=product)
    categories = Category.get_all()
    form.category.choices = [(str(c.id), c.name) for c in categories]
    form.category.data = str(product.category_id)
    
    if form.validate_on_submit():
        try:
            product.update(
                name=form.name.data,
                description=form.description.data,
                price=form.price.data,
                category_id=int(form.category.data),
                stock_quantity=form.stock_quantity.data,
                sku=form.sku.data,
                image=form.image.data or ''
            )
            flash('Product updated successfully!', 'success')
            return redirect(url_for('admin.products'))
        except Exception as e:
            flash(f'Error updating product: {str(e)}', 'error')
    
    return render_template('admin/product_form.html', form=form, product=product, title='Edit Product')

@admin_bp.route('/products/<int:product_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_product(product_id):
    try:
        product = Product.query.get(product_id)
        if product:
            product.delete()
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Product not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@admin_bp.route('/categories')
@login_required
@admin_required
def categories():
    categories = Category.get_all()
    return render_template('admin/categories.html', categories=categories)

@admin_bp.route('/categories/new', methods=['GET', 'POST'])
@login_required
@admin_required
def new_category():
    form = CategoryForm()
    
    if form.validate_on_submit():
        category = Category.create_category(
            name=form.name.data,
            description=form.description.data,
            slug=form.slug.data
        )
        flash('Category created successfully!', 'success')
        return redirect(url_for('admin.categories'))
    
    return render_template('admin/category_form.html', form=form, title='New Category')

@admin_bp.route('/orders')
@login_required
@admin_required
def orders():
    orders = Order.get_all_orders()
    return render_template('admin/orders.html', orders=orders)

@admin_bp.route('/customers')
@login_required
@admin_required
def customers():
    customers = User.query.filter_by(role='user').all()
    return render_template('admin/customers.html', customers=customers)

@admin_bp.route('/orders/<int:order_id>')
@login_required
@admin_required
def order_detail(order_id):
    order = Order.query.get_or_404(order_id)
    return render_template('admin/order_detail.html', order=order)
