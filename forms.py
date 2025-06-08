from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField, FloatField, IntegerField, SelectField, HiddenField, BooleanField
from wtforms.validators import DataRequired, Email, Length, NumberRange, EqualTo

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])

class RegisterForm(FlaskForm):
    first_name = StringField('First Name', validators=[DataRequired(), Length(min=2, max=50)])
    last_name = StringField('Last Name', validators=[DataRequired(), Length(min=2, max=50)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm Password', validators=[
        DataRequired(), 
        EqualTo('password', message='Passwords must match')
    ])
    phone = StringField('Phone Number', validators=[Length(max=20)])

class ProfileForm(FlaskForm):
    first_name = StringField('First Name', validators=[DataRequired(), Length(min=2, max=50)])
    last_name = StringField('Last Name', validators=[DataRequired(), Length(min=2, max=50)])
    phone = StringField('Phone Number', validators=[Length(max=20)])

class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Current Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[DataRequired(), Length(min=6)])
    confirm_password = PasswordField('Confirm New Password', validators=[
        DataRequired(),
        EqualTo('new_password', message='Passwords must match')
    ])

class ProductForm(FlaskForm):
    name = StringField('Product Name', validators=[DataRequired(), Length(min=2, max=100)])
    description = TextAreaField('Description', validators=[DataRequired()])
    price = FloatField('Price', validators=[DataRequired(), NumberRange(min=0.01)])
    category = SelectField('Category', validators=[DataRequired()])
    stock_quantity = IntegerField('Stock Quantity', validators=[DataRequired(), NumberRange(min=0)])
    sku = StringField('SKU', validators=[DataRequired(), Length(min=2, max=50)])
    image = StringField('Image URL')

class CategoryForm(FlaskForm):
    name = StringField('Category Name', validators=[DataRequired(), Length(min=2, max=50)])
    description = TextAreaField('Description')
    slug = StringField('Slug', validators=[DataRequired(), Length(min=2, max=50)])

class AddressForm(FlaskForm):
    first_name = StringField('First Name', validators=[DataRequired(), Length(min=2, max=50)])
    last_name = StringField('Last Name', validators=[DataRequired(), Length(min=2, max=50)])
    address_line1 = StringField('Address Line 1', validators=[DataRequired()])
    address_line2 = StringField('Address Line 2')
    city = StringField('City', validators=[DataRequired()])
    state = StringField('State', validators=[DataRequired()])
    postal_code = StringField('Postal Code', validators=[DataRequired()])
    country = StringField('Country', validators=[DataRequired()])
    is_default = BooleanField('Set as Default Address')

class ContactForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired(), Length(min=2, max=100)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    subject = StringField('Subject', validators=[DataRequired(), Length(min=5, max=200)])
    message = TextAreaField('Message', validators=[DataRequired(), Length(min=10)])

class CheckoutForm(FlaskForm):
    shipping_address = SelectField('Shipping Address', validators=[DataRequired()])
    billing_address = SelectField('Billing Address', validators=[DataRequired()])
    payment_method = SelectField('Payment Method', choices=[
        ('card', 'Credit/Debit Card'),
        ('paypal', 'PayPal'),
        ('cod', 'Cash on Delivery')
    ], validators=[DataRequired()])
