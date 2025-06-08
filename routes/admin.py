from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from functools import wraps
from models import Product, Category, Order, User
from forms import ProductForm, CategoryForm

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
    # Get some basic stats
    total_products = len(Product.get_admin_products())
    total_categories = len(Category.get_all())
    total_orders = len(Order.get_all_orders())
    
    # Get recent orders
    recent_orders = Order.get_all_orders()[:5]
    
    return render_template('admin/dashboard.html',
                         total_products=total_products,
                         total_categories=total_categories,
                         total_orders=total_orders,
                         recent_orders=recent_orders)

@admin_bp.route('/products')
@login_required
@admin_required
def products():
    products = Product.get_admin_products()
    return render_template('admin/products.html', products=products)

@admin_bp.route('/products/new', methods=['GET', 'POST'])
@login_required
@admin_required
def new_product():
    form = ProductForm()
    categories = Category.get_all()
    form.category.choices = [(c.id, c.name) for c in categories]
    
    if form.validate_on_submit():
        product = Product.create_product(
            name=form.name.data,
            description=form.description.data,
            price=form.price.data,
            category_id=form.category.data,
            stock_quantity=form.stock_quantity.data,
            sku=form.sku.data,
            image=form.image.data
        )
        flash('Product created successfully!', 'success')
        return redirect(url_for('admin.products'))
    
    return render_template('admin/product_form.html', form=form, title='New Product')

@admin_bp.route('/products/<product_id>/edit', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_product(product_id):
    product = Product.get_by_id(product_id)
    if not product:
        flash('Product not found.', 'error')
        return redirect(url_for('admin.products'))
    
    form = ProductForm(obj=product)
    categories = Category.get_all()
    form.category.choices = [(c.id, c.name) for c in categories]
    
    if form.validate_on_submit():
        product.update(
            name=form.name.data,
            description=form.description.data,
            price=form.price.data,
            category_id=form.category.data,
            stock_quantity=form.stock_quantity.data,
            sku=form.sku.data,
            image=form.image.data
        )
        flash('Product updated successfully!', 'success')
        return redirect(url_for('admin.products'))
    
    # Pre-populate form with current values
    if request.method == 'GET':
        form.name.data = product.name
        form.description.data = product.description
        form.price.data = product.price
        form.category.data = str(product.category)
        form.stock_quantity.data = product.stock_quantity
        form.sku.data = product.sku
        form.image.data = product.image
    
    return render_template('admin/product_form.html', form=form, product=product, title='Edit Product')

@admin_bp.route('/products/<product_id>/delete')
@login_required
@admin_required
def delete_product(product_id):
    product = Product.get_by_id(product_id)
    if product:
        product.delete()
        flash('Product deleted successfully!', 'success')
    else:
        flash('Product not found.', 'error')
    
    return redirect(url_for('admin.products'))

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
