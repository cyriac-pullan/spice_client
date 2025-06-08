from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from bson import ObjectId
from datetime import datetime
from utils.db import get_db

class User(UserMixin):
    def __init__(self, user_data):
        self.id = str(user_data.get('_id'))
        self.first_name = user_data.get('firstName', '')
        self.last_name = user_data.get('lastName', '')
        self.email = user_data.get('email')
        self.password_hash = user_data.get('password')
        self.phone = user_data.get('phone', '')
        self.role = user_data.get('role', 'user')
        self.wishlist = user_data.get('wishlist', [])
        self.created_at = user_data.get('createdAt', datetime.utcnow())

    @staticmethod
    def get_by_id(user_id):
        db = get_db()
        user_data = db.users.find_one({'_id': ObjectId(user_id)})
        if user_data:
            return User(user_data)
        return None

    @staticmethod
    def get_by_email(email):
        db = get_db()
        user_data = db.users.find_one({'email': email})
        if user_data:
            return User(user_data)
        return None

    @staticmethod
    def create_user(first_name, last_name, email, password, phone=''):
        db = get_db()
        # Check if user already exists
        if db.users.find_one({'email': email}):
            return None
        
        user_data = {
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'password': generate_password_hash(password),
            'phone': phone,
            'role': 'user',
            'wishlist': [],
            'createdAt': datetime.utcnow()
        }
        result = db.users.insert_one(user_data)
        user_data['_id'] = result.inserted_id
        return User(user_data)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def update_profile(self, first_name, last_name, phone=''):
        db = get_db()
        db.users.update_one(
            {'_id': ObjectId(self.id)},
            {'$set': {
                'firstName': first_name,
                'lastName': last_name,
                'phone': phone
            }}
        )
        self.first_name = first_name
        self.last_name = last_name
        self.phone = phone

    def change_password(self, new_password):
        db = get_db()
        new_hash = generate_password_hash(new_password)
        db.users.update_one(
            {'_id': ObjectId(self.id)},
            {'$set': {'password': new_hash}}
        )
        self.password_hash = new_hash

    def add_to_wishlist(self, product_id):
        db = get_db()
        if ObjectId(product_id) not in self.wishlist:
            db.users.update_one(
                {'_id': ObjectId(self.id)},
                {'$push': {'wishlist': ObjectId(product_id)}}
            )
            self.wishlist.append(ObjectId(product_id))

    def remove_from_wishlist(self, product_id):
        db = get_db()
        db.users.update_one(
            {'_id': ObjectId(self.id)},
            {'$pull': {'wishlist': ObjectId(product_id)}}
        )
        self.wishlist = [pid for pid in self.wishlist if str(pid) != product_id]

class Product:
    def __init__(self, product_data):
        self.id = str(product_data.get('_id'))
        self.name = product_data.get('name')
        self.description = product_data.get('description')
        self.price = product_data.get('price')
        self.category = product_data.get('category')
        self.stock_quantity = product_data.get('stockQuantity', 0)
        self.sku = product_data.get('sku')
        self.status = product_data.get('status', 'active')
        self.image = product_data.get('image', '/static/images/placeholder.jpg')
        self.created_at = product_data.get('createdAt', datetime.utcnow())

    @staticmethod
    def get_all(category=None, search=None, limit=20, offset=0):
        db = get_db()
        query = {'status': 'active'}
        
        if category:
            query['category'] = ObjectId(category)
        
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}}
            ]
        
        products_data = db.products.find(query).sort('createdAt', -1).limit(limit).skip(offset)
        return [Product(p) for p in products_data]

    @staticmethod
    def get_by_id(product_id):
        db = get_db()
        product_data = db.products.find_one({'_id': ObjectId(product_id), 'status': 'active'})
        if product_data:
            return Product(product_data)
        return None

    @staticmethod
    def get_admin_products():
        db = get_db()
        products_data = db.products.find().sort('createdAt', -1)
        return [Product(p) for p in products_data]

    @staticmethod
    def create_product(name, description, price, category_id, stock_quantity, sku, image=''):
        db = get_db()
        product_data = {
            'name': name,
            'description': description,
            'price': float(price),
            'category': ObjectId(category_id),
            'stockQuantity': int(stock_quantity),
            'sku': sku,
            'status': 'active',
            'image': image or '/static/images/placeholder.jpg',
            'createdAt': datetime.utcnow()
        }
        result = db.products.insert_one(product_data)
        product_data['_id'] = result.inserted_id
        return Product(product_data)

    def update(self, name, description, price, category_id, stock_quantity, sku, image=None):
        db = get_db()
        update_data = {
            'name': name,
            'description': description,
            'price': float(price),
            'category': ObjectId(category_id),
            'stockQuantity': int(stock_quantity),
            'sku': sku
        }
        if image:
            update_data['image'] = image
        
        db.products.update_one(
            {'_id': ObjectId(self.id)},
            {'$set': update_data}
        )

    def delete(self):
        db = get_db()
        db.products.update_one(
            {'_id': ObjectId(self.id)},
            {'$set': {'status': 'inactive'}}
        )

class Category:
    def __init__(self, category_data):
        self.id = str(category_data.get('_id'))
        self.name = category_data.get('name')
        self.description = category_data.get('description')
        self.slug = category_data.get('slug')
        self.status = category_data.get('status', 'active')

    @staticmethod
    def get_all():
        db = get_db()
        categories_data = db.categories.find({'status': 'active'})
        return [Category(c) for c in categories_data]

    @staticmethod
    def get_by_id(category_id):
        db = get_db()
        category_data = db.categories.find_one({'_id': ObjectId(category_id)})
        if category_data:
            return Category(category_data)
        return None

    @staticmethod
    def create_category(name, description, slug):
        db = get_db()
        category_data = {
            'name': name,
            'description': description,
            'slug': slug,
            'status': 'active'
        }
        result = db.categories.insert_one(category_data)
        category_data['_id'] = result.inserted_id
        return Category(category_data)

class Order:
    def __init__(self, order_data):
        self.id = str(order_data.get('_id'))
        self.user = order_data.get('user')
        self.items = order_data.get('items', [])
        self.shipping_address = order_data.get('shippingAddress', {})
        self.billing_address = order_data.get('billingAddress', {})
        self.total_amount = order_data.get('totalAmount', 0)
        self.status = order_data.get('status', 'pending')
        self.created_at = order_data.get('createdAt', datetime.utcnow())

    @staticmethod
    def create_order(user_id, items, shipping_address, billing_address, total_amount):
        db = get_db()
        order_data = {
            'user': ObjectId(user_id),
            'items': items,
            'shippingAddress': shipping_address,
            'billingAddress': billing_address,
            'totalAmount': float(total_amount),
            'status': 'pending',
            'createdAt': datetime.utcnow()
        }
        result = db.orders.insert_one(order_data)
        order_data['_id'] = result.inserted_id
        return Order(order_data)

    @staticmethod
    def get_user_orders(user_id):
        db = get_db()
        orders_data = db.orders.find({'user': ObjectId(user_id)}).sort('createdAt', -1)
        return [Order(o) for o in orders_data]

    @staticmethod
    def get_all_orders():
        db = get_db()
        orders_data = db.orders.find().sort('createdAt', -1)
        return [Order(o) for o in orders_data]

class Address:
    def __init__(self, address_data):
        self.id = str(address_data.get('_id'))
        self.user = address_data.get('user')
        self.first_name = address_data.get('firstName')
        self.last_name = address_data.get('lastName')
        self.address_line1 = address_data.get('addressLine1')
        self.address_line2 = address_data.get('addressLine2', '')
        self.city = address_data.get('city')
        self.state = address_data.get('state')
        self.postal_code = address_data.get('postalCode')
        self.country = address_data.get('country')
        self.is_default = address_data.get('isDefault', False)

    @staticmethod
    def get_user_addresses(user_id):
        db = get_db()
        addresses_data = db.addresses.find({'user': ObjectId(user_id)})
        return [Address(a) for a in addresses_data]

    @staticmethod
    def create_address(user_id, first_name, last_name, address_line1, address_line2, city, state, postal_code, country, is_default=False):
        db = get_db()
        address_data = {
            'user': ObjectId(user_id),
            'firstName': first_name,
            'lastName': last_name,
            'addressLine1': address_line1,
            'addressLine2': address_line2,
            'city': city,
            'state': state,
            'postalCode': postal_code,
            'country': country,
            'isDefault': is_default
        }
        result = db.addresses.insert_one(address_data)
        address_data['_id'] = result.inserted_id
        return Address(address_data)
