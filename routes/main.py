from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_required, current_user
from models import Product, Category, Order, Address
from forms import ContactForm, ProfileForm, ChangePasswordForm, AddressForm, CheckoutForm
from utils.helpers import get_cart_items, clear_cart

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    featured_products = Product.get_all(limit=8)
    categories = Category.get_all()
    return render_template('index.html', featured_products=featured_products, categories=categories)

@main_bp.route('/contact', methods=['GET', 'POST'])
def contact():
    form = ContactForm()
    if form.validate_on_submit():
        # Here you would typically send email or save to database
        flash('Thank you for your message! We will get back to you soon.', 'success')
        return redirect(url_for('main.contact'))
    
    return render_template('contact.html', form=form)

@main_bp.route('/profile')
@login_required
def profile():
    user_orders = Order.get_user_orders(current_user.id)
    return render_template('user/profile.html', orders=user_orders[:5])

@main_bp.route('/profile/edit', methods=['GET', 'POST'])
@login_required
def edit_profile():
    form = ProfileForm()
    
    if form.validate_on_submit():
        current_user.update_profile(
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            phone=form.phone.data
        )
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('main.profile'))
    
    # Pre-populate form
    if request.method == 'GET':
        form.first_name.data = current_user.first_name
        form.last_name.data = current_user.last_name
        form.phone.data = current_user.phone
    
    return render_template('user/edit_profile.html', form=form)

@main_bp.route('/profile/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    form = ChangePasswordForm()
    
    if form.validate_on_submit():
        if current_user.check_password(form.current_password.data):
            current_user.change_password(form.new_password.data)
            flash('Password changed successfully!', 'success')
            return redirect(url_for('main.profile'))
        else:
            flash('Current password is incorrect.', 'error')
    
    return render_template('user/change_password.html', form=form)

@main_bp.route('/orders')
@login_required
def orders():
    user_orders = Order.get_user_orders(current_user.id)
    return render_template('user/orders.html', orders=user_orders)

@main_bp.route('/addresses')
@login_required
def addresses():
    user_addresses = Address.get_user_addresses(current_user.id)
    return render_template('user/addresses.html', addresses=user_addresses)

@main_bp.route('/addresses/new', methods=['GET', 'POST'])
@login_required
def new_address():
    form = AddressForm()
    
    if form.validate_on_submit():
        address = Address.create_address(
            user_id=current_user.id,
            first_name=form.first_name.data,
            last_name=form.last_name.data,
            address_line1=form.address_line1.data,
            address_line2=form.address_line2.data,
            city=form.city.data,
            state=form.state.data,
            postal_code=form.postal_code.data,
            country=form.country.data,
            is_default=form.is_default.data
        )
        flash('Address added successfully!', 'success')
        return redirect(url_for('main.addresses'))
    
    return render_template('user/address_form.html', form=form, title='New Address')

@main_bp.route('/addresses/<int:address_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_address(address_id):
    address = Address.query.filter_by(id=address_id, user_id=current_user.id).first_or_404()
    form = AddressForm(obj=address)
    if form.validate_on_submit():
        address.first_name = form.first_name.data
        address.last_name = form.last_name.data
        address.address_line1 = form.address_line1.data
        address.address_line2 = form.address_line2.data
        address.city = form.city.data
        address.state = form.state.data
        address.postal_code = form.postal_code.data
        address.country = form.country.data
        address.is_default = form.is_default.data
        Address.query.filter_by(user_id=current_user.id, is_default=True).update({'is_default': False}) if address.is_default else None
        address.is_default = form.is_default.data
        address.save() if hasattr(address, 'save') else None
        from extensions import db
        db.session.commit()
        flash('Address updated successfully!', 'success')
        return redirect(url_for('main.addresses'))
    return render_template('user/address_form.html', form=form, title='Edit Address')

@main_bp.route('/addresses/<int:address_id>/delete', methods=['POST'])
@login_required
def delete_address(address_id):
    address = Address.query.filter_by(id=address_id, user_id=current_user.id).first_or_404()
    from extensions import db
    db.session.delete(address)
    db.session.commit()
    flash('Address deleted successfully!', 'success')
    return redirect(url_for('main.addresses'))

@main_bp.route('/checkout', methods=['GET', 'POST'])
@login_required
def checkout():
    cart_items = get_cart_items()
    if not cart_items:
        flash('Your cart is empty.', 'error')
        return redirect(url_for('products.cart'))
    
    user_addresses = Address.get_user_addresses(current_user.id)
    if not user_addresses:
        flash('Please add an address before checkout.', 'error')
        return redirect(url_for('main.new_address'))
    
    form = CheckoutForm()
    form.shipping_address.choices = [(a.id, f"{a.first_name} {a.last_name}, {a.address_line1}, {a.city}") for a in user_addresses]
    form.billing_address.choices = [(a.id, f"{a.first_name} {a.last_name}, {a.address_line1}, {a.city}") for a in user_addresses]
    
    if form.validate_on_submit():
        # Only allow Cash on Delivery
        if form.payment_method.data != 'cod':
            flash('Only Cash on Delivery is available at this time.', 'error')
            return redirect(url_for('main.checkout'))

        total = sum(item['subtotal'] for item in cart_items)
        # Get selected addresses
        shipping_addr_id = int(form.shipping_address.data)
        billing_addr_id = int(form.billing_address.data)
        shipping_addr = next(a for a in user_addresses if a.id == shipping_addr_id)
        billing_addr = next(a for a in user_addresses if a.id == billing_addr_id)

        # Create order with payment method and status
        order = Order.create_order(
            user_id=current_user.id,
            items=[{
                'product_id': item['product'].id,
                'name': item['product'].name,
                'price': item['product'].price,
                'quantity': item['quantity'],
                'subtotal': item['subtotal']
            } for item in cart_items],
            shipping_address_id=shipping_addr.id,
            billing_address_id=billing_addr.id,
            total_amount=total,
            payment_method='Cash on Delivery',
            payment_status='pending',
            status='pending'
        )

        clear_cart()
        flash('Order placed successfully! You will pay upon delivery.', 'success')
        return redirect(url_for('main.orders'))
    
    total = sum(item['subtotal'] for item in cart_items)
    return render_template('checkout.html', form=form, cart_items=cart_items, total=total)
