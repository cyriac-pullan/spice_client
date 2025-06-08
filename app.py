import os
import logging
from flask import Flask
from flask_login import LoginManager
from utils.db import init_db

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "test_secret_key_123")

# Initialize MongoDB connection
db = init_db()

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.get_by_id(user_id)

# Register blueprints
from routes.main import main_bp
from routes.auth import auth_bp
from routes.products import products_bp
from routes.admin import admin_bp

app.register_blueprint(main_bp)
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(products_bp, url_prefix='/products')
app.register_blueprint(admin_bp, url_prefix='/admin')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
