const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');

// Connect to test database
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const createTestData = async () => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await Product.deleteMany({});
        await Category.deleteMany({});

        // Create test categories
        const categories = await Category.insertMany([
            {
                name: 'Spices',
                description: 'Various spices and seasonings',
                status: 'active',
                slug: 'spices'
            },
            {
                name: 'Herbs',
                description: 'Fresh and dried herbs',
                status: 'active',
                slug: 'herbs'
            },
            {
                name: 'Seasoning Mixes',
                description: 'Pre-mixed seasoning combinations',
                status: 'active',
                slug: 'seasoning-mixes'
            }
        ]);

        // Create test products
        const products = await Product.insertMany([
            {
                name: 'Black Pepper',
                description: 'Premium whole black peppercorns',
                price: 5.99,
                category: categories[0]._id,
                stockQuantity: 100,
                sku: 'BP-001',
                status: 'active',
                image: '/images/products/black-pepper.jpg'
            },
            {
                name: 'Basil',
                description: 'Dried basil leaves',
                price: 4.99,
                category: categories[1]._id,
                stockQuantity: 50,
                sku: 'BS-001',
                status: 'active',
                image: '/images/products/basil.jpg'
            },
            {
                name: 'Italian Seasoning',
                description: 'Classic Italian herb blend',
                price: 6.99,
                category: categories[2]._id,
                stockQuantity: 75,
                sku: 'IS-001',
                status: 'active',
                image: '/images/products/italian-seasoning.jpg'
            }
        ]);

        // Create test users
        const hashedPassword = await bcrypt.hash('test123', 10);
        const users = await User.insertMany([
            {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                password: hashedPassword,
                phone: '1234567890',
                role: 'user'
            },
            {
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com',
                password: hashedPassword,
                phone: '0987654321',
                role: 'admin'
            }
        ]);

        console.log('Test data created successfully!');
        console.log('Created:', {
            categories: categories.length,
            products: products.length,
            users: users.length
        });

        // Print test credentials
        console.log('\nTest User Credentials:');
        console.log('Email: test@example.com');
        console.log('Password: test123');
        console.log('\nAdmin Credentials:');
        console.log('Email: admin@example.com');
        console.log('Password: test123');

    } catch (error) {
        console.error('Error creating test data:', error);
    } finally {
        mongoose.connection.close();
    }
};

createTestData(); 