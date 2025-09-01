
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from datetime import datetime
from extensions import db

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    orders = db.relationship('Order', backref='user', lazy=True)
    addresses = db.relationship('Address', backref='user', lazy=True)
    wishlist_items = db.relationship('WishlistItem', backref='user', lazy=True)

    @staticmethod
    def get_by_email(email):
        return User.query.filter_by(email=email).first()

    @staticmethod
    def create_user(first_name, last_name, email, password, phone=''):
        # Check if user already exists
        if User.query.filter_by(email=email).first():
            return None
        
        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=generate_password_hash(password),
            phone=phone
        )
        db.session.add(user)
        db.session.commit()
        return user

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def update_profile(self, first_name, last_name, phone=''):
        self.first_name = first_name
        self.last_name = last_name
        self.phone = phone
        db.session.commit()

    def change_password(self, new_password):
        self.password_hash = generate_password_hash(new_password)
        db.session.commit()

    def add_to_wishlist(self, product_id):
        if not WishlistItem.query.filter_by(user_id=self.id, product_id=product_id).first():
            wishlist_item = WishlistItem(user_id=self.id, product_id=product_id)
            db.session.add(wishlist_item)
            db.session.commit()

    def remove_from_wishlist(self, product_id):
        wishlist_item = WishlistItem.query.filter_by(user_id=self.id, product_id=product_id).first()
        if wishlist_item:
            db.session.delete(wishlist_item)
            db.session.commit()

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    slug = db.Column(db.String(50), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    products = db.relationship('Product', backref='category', lazy=True)

    @staticmethod
    def get_all():
        return Category.query.all()

    @staticmethod
    def create_category(name, description, slug):
        category = Category(
            name=name,
            description=description,
            slug=slug
        )
        db.session.add(category)
        db.session.commit()
        return category

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    original_price = db.Column(db.Numeric(10, 2))
    category_id = db.Column(db.Integer, db.ForeignKey('categories.id'), nullable=False)
    stock_quantity = db.Column(db.Integer, nullable=False, default=0)
    sku = db.Column(db.String(50), unique=True, nullable=False)
    image = db.Column(db.String(255))
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    order_items = db.relationship('OrderItem', backref='product', lazy=True)
    wishlist_items = db.relationship('WishlistItem', backref='product', lazy=True)

    @staticmethod
    def get_all(category=None, search=None, limit=20, offset=0):
        query = Product.query.filter_by(status='active')
        
        if category:
            query = query.filter(Product.category_id == category)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Product.name.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )
        
        return query.offset(offset).limit(limit).all()

    @staticmethod
    def get_by_id(product_id):
        return Product.query.get(product_id)

    @staticmethod
    def get_admin_products():
        return Product.query.all()

    @staticmethod
    def create_product(name, description, price, category_id, stock_quantity, sku, image=None, original_price=None):
        product = Product(
            name=name,
            description=description,
            price=price,
            original_price=original_price,
            category_id=category_id,
            stock_quantity=stock_quantity,
            sku=sku,
            image=image or ''
        )
        db.session.add(product)
        db.session.commit()
        return product

    def update(self, name, description, price, category_id, stock_quantity, sku, image=None, original_price=None):
        self.name = name
        self.description = description
        self.price = price
        self.original_price = original_price
        self.category_id = category_id
        self.stock_quantity = stock_quantity
        self.sku = sku
        if image:
            self.image = image
        db.session.commit()

    def delete(self):
        self.status = 'inactive'
        db.session.commit()

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20), default='pending')
    payment_status = db.Column(db.String(20), default='pending')
    shipping_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'))
    billing_address_id = db.Column(db.Integer, db.ForeignKey('addresses.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    items = db.relationship('OrderItem', backref='order', lazy=True)
    shipping_address = db.relationship('Address', foreign_keys=[shipping_address_id])
    billing_address = db.relationship('Address', foreign_keys=[billing_address_id])

    @staticmethod
    def create_order(user_id, items, shipping_address_id, billing_address_id, total_amount):
        order = Order(
            user_id=user_id,
            total_amount=total_amount,
            shipping_address_id=shipping_address_id,
            billing_address_id=billing_address_id
        )
        db.session.add(order)
        db.session.flush()  # Get the order ID
        
        # Add order items
        for item in items:
            order_item = OrderItem(
                order_id=order.id,
                product_id=item['product_id'],
                quantity=item['quantity'],
                price=item['price']
            )
            db.session.add(order_item)
        
        db.session.commit()
        return order

    @staticmethod
    def get_user_orders(user_id):
        return Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()

    @staticmethod
    def get_all_orders():
        return Order.query.order_by(Order.created_at.desc()).all()

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)

class Address(db.Model):
    __tablename__ = 'addresses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    address_line1 = db.Column(db.String(255), nullable=False)
    address_line2 = db.Column(db.String(255))
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    postal_code = db.Column(db.String(20), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def create_address(user_id, first_name, last_name, address_line1, address_line2, city, state, postal_code, country, is_default=False):
        # If this is set as default, remove default from other addresses
        if is_default:
            Address.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
        
        address = Address(
            user_id=user_id,
            first_name=first_name,
            last_name=last_name,
            address_line1=address_line1,
            address_line2=address_line2,
            city=city,
            state=state,
            postal_code=postal_code,
            country=country,
            is_default=is_default
        )
        db.session.add(address)
        db.session.commit()
        return address

    @staticmethod
    def get_user_addresses(user_id):
        return Address.query.filter_by(user_id=user_id).all()

class WishlistItem(db.Model):
    __tablename__ = 'wishlist_items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'product_id'),)

def create_sample_data():
    """Create sample data for testing"""
    # Check if data already exists
    if User.query.first():
        return
    
    # Create categories
    categories = [
        {'name': 'Whole Spices', 'slug': 'whole-spices', 'description': 'Premium whole spices for authentic flavors'},
        {'name': 'Ground Spices', 'slug': 'ground-spices', 'description': 'Fresh ground spices and masalas'},
        {'name': 'Spice Blends', 'slug': 'spice-blends', 'description': 'Traditional spice mix blends'},
        {'name': 'Herbs', 'slug': 'herbs', 'description': 'Fresh and dried herbs'},
        {'name': 'Seeds', 'slug': 'seeds', 'description': 'Aromatic seeds for cooking'}
    ]
    
    for cat_data in categories:
        Category.create_category(**cat_data)
    
    # Create admin user
    admin_user = User.create_user(
        first_name='Admin',
        last_name='User',
        email='admin@delispi.com',
        password='admin123',
        phone='+1234567890'
    )
    admin_user.role = 'admin'
    db.session.commit()
    
    # Create regular user
    User.create_user(
        first_name='John',
        last_name='Doe',
        email='john@example.com',
        password='password123',
        phone='+1987654321'
    )
    
    # Create products
    products = [
        {
            'name': 'Cardamom Pods',
            'description': 'Premium green cardamom pods with intense aroma and flavor. Perfect for biryanis, desserts, and chai.',
            'price': 12.99,
            'original_price': 15.99,
            'category_id': 1,  # Whole Spices
            'stock_quantity': 50,
            'sku': 'CARD001',
            'image': '/static/images/products/cardamom.jpg'
        },
        {
            'name': 'Turmeric Powder',
            'description': 'Fresh ground turmeric powder with vibrant color and earthy flavor. Essential for Indian cooking.',
            'price': 8.99,
            'original_price': 10.99,
            'category_id': 2,  # Ground Spices
            'stock_quantity': 75,
            'sku': 'TURM001',
            'image': '/static/images/products/turmeric.jpg'
        },
        {
            'name': 'Garam Masala',
            'description': 'Traditional blend of warming spices including cinnamon, cardamom, cloves, and black pepper.',
            'price': 9.99,
            'category_id': 3,  # Spice Blends
            'stock_quantity': 40,
            'sku': 'GARA001',
            'image': '/static/images/products/garam-masala.jpg'
        },
        {
            'name': 'Fresh Curry Leaves',
            'description': 'Aromatic curry leaves, essential for South Indian cooking. Adds authentic flavor to any dish.',
            'price': 6.99,
            'category_id': 4,  # Herbs
            'stock_quantity': 25,
            'sku': 'CURR001',
            'image': '/static/images/products/curry-leaves.jpg'
        },
        {
            'name': 'Cumin Seeds',
            'description': 'Whole cumin seeds with earthy, warm flavor. Perfect for tempering and spice blends.',
            'price': 7.99,
            'category_id': 5,  # Seeds
            'stock_quantity': 60,
            'sku': 'CUMI001',
            'image': '/static/images/products/cumin-seeds.jpg'
        }
    ]
    
    for product_data in products:
        Product.create_product(**product_data)
    
    print("Sample data created successfully!")
    
class CartItem(db.Model):
    __tablename__ = 'cart_items'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='cart_items')
    product = db.relationship('Product')