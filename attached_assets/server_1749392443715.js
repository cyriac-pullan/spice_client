const express = require('express');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Order = require('./models/Order');
const Address = require('./models/Address');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Connect to MongoDB
connectDB();

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        
        // Verify user still exists in database
        User.findById(decoded.id)
            .then(user => {
                if (!user) {
                    return res.status(403).json({ error: 'User no longer exists' });
                }
                req.user = {
                    id: user._id,
                    email: user.email,
                    role: user.role
                };
                next();
            })
            .catch(err => {
                console.error('Error verifying user:', err);
                res.status(500).json({ error: 'Server error' });
            });
    });
}

// Admin middleware
function isAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role?.toLowerCase() !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    
    next();
}

// API Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, phone } = req.body;
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ error: 'All required fields must be provided' });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        const user = new User({ firstName, lastName, email, password, phone });
        await user.save();
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Products routes
app.get('/api/products', async (req, res) => {
    try {
        const { category, search, limit = 20, offset = 0 } = req.query;
        let query = { status: 'active' };
        if (category) {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findOne({ _id: req.params.id, status: 'active' });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Categories routes
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({ status: 'active' });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Orders routes
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, shippingAddress, billingAddress, totalAmount } = req.body;
        const userId = req.user.id;
        if (!items || !items.length || !shippingAddress || !totalAmount) {
            return res.status(400).json({ error: 'Missing required order information' });
        }
        const order = new Order({
            user: userId,
            items,
            shippingAddress,
            billingAddress,
            totalAmount
        });
        await order.save();
        res.json({ orderId: order._id, message: 'Order created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Contact form
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;
    
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Here you would typically save to database and/or send email
    console.log('Contact form submission:', { name, email, subject, message });
    
    res.json({ message: 'Message sent successfully' });
});

// User profile routes
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName } = req.body;
        const user = await User.findByIdAndUpdate(
            req.user.id,
            { firstName, lastName },
            { new: true }
        ).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Address routes
app.get('/api/users/addresses', authenticateToken, async (req, res) => {
    try {
        const addresses = await Address.find({ user: req.user.id });
        res.json(addresses);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users/addresses', authenticateToken, async (req, res) => {
    try {
        const address = new Address({
            ...req.body,
            user: req.user.id
        });
        await address.save();
        res.json(address);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/users/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const address = await Address.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            req.body,
            { new: true }
        );
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json(address);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/users/addresses/:id', authenticateToken, async (req, res) => {
    try {
        const address = await Address.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        res.json({ message: 'Address deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Wishlist routes
app.get('/api/users/wishlist', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('wishlist');
        res.json(user.wishlist);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/users/wishlist/:productId', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user.wishlist.includes(req.params.productId)) {
            user.wishlist.push(req.params.productId);
            await user.save();
        }
        res.json({ message: 'Product added to wishlist' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/users/wishlist/:productId', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.productId);
        await user.save();
        res.json({ message: 'Product removed from wishlist' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Product Routes
app.get('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category', 'name')
            .sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name');
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/admin/products', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = new Product(req.body);
        await product.save();
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/products/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve user-facing HTML files from views directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'products.html'));
});

app.get('/product-detail', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'product-detail.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

app.get('/user-account', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'user-account.html'));
});

// Serve admin HTML files from public/admin directory
app.get('/admin/:page?', (req, res) => {
    const page = req.params.page ? req.params.page : 'admin';
    const filePath = path.join(__dirname, 'public', 'admin', `${page}.html`);
    
    // Check if file exists before sending
    if (require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Admin page not found');
    }
});

// Admin routes
app.get('/api/admin/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Get current month stats
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        // Get last month stats
        const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

        // Current month orders
        const currentMonthOrders = await Order.countDocuments({
            createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        });

        // Last month orders
        const lastMonthOrders = await Order.countDocuments({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });

        // Calculate order change percentage
        const orderChange = lastMonthOrders === 0 ? 100 : 
            ((currentMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;

        // Current month revenue
        const currentMonthRevenue = await Order.aggregate([
            { 
                $match: { 
                    status: 'completed',
                    createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        // Last month revenue
        const lastMonthRevenue = await Order.aggregate([
            { 
                $match: { 
                    status: 'completed',
                    createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
                }
            },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);

        // Calculate revenue change percentage
        const revenueChange = !lastMonthRevenue[0]?.total ? 100 :
            ((currentMonthRevenue[0]?.total || 0) - (lastMonthRevenue[0]?.total || 0)) / (lastMonthRevenue[0]?.total || 1) * 100;

        // Current month users
        const currentMonthUsers = await User.countDocuments({
            createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        });

        // Last month users
        const lastMonthUsers = await User.countDocuments({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });

        // Calculate user change percentage
        const userChange = lastMonthUsers === 0 ? 100 :
            ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100;

        // Current month products
        const currentMonthProducts = await Product.countDocuments({
            createdAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth }
        });

        // Last month products
        const lastMonthProducts = await Product.countDocuments({
            createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
        });

        // Calculate product change percentage
        const productChange = lastMonthProducts === 0 ? 100 :
            ((currentMonthProducts - lastMonthProducts) / lastMonthProducts) * 100;

        res.json({
            totalOrders: currentMonthOrders,
            totalRevenue: currentMonthRevenue[0]?.total || 0,
            totalUsers: currentMonthUsers,
            totalProducts: currentMonthProducts,
            orderChange: Math.round(orderChange * 10) / 10,
            revenueChange: Math.round(revenueChange * 10) / 10,
            userChange: Math.round(userChange * 10) / 10,
            productChange: Math.round(productChange * 10) / 10
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/charts', authenticateToken, isAdmin, async (req, res) => {
    try {
        // Get last 6 months of sales data
        const months = [];
        const salesData = [];
        const categoryData = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            // Get sales for this month
            const monthSales = await Order.aggregate([
                {
                    $match: {
                        status: 'completed',
                        createdAt: { $gte: firstDay, $lte: lastDay }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ]);

            months.push(date.toLocaleString('default', { month: 'short' }));
            salesData.push(monthSales[0]?.total || 0);
        }

        // Get category distribution
        const categories = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 4
            }
        ]);

        res.json({
            sales: {
                labels: months,
                data: salesData
            },
            categories: {
                labels: categories.map(c => c._id),
                data: categories.map(c => c.count)
            }
        });
    } catch (error) {
        console.error('Error fetching chart data:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/orders/recent', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('user', 'firstName lastName email');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/users/recent', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/users', authenticateToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Orders routes
app.get('/api/admin/orders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/orders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'firstName lastName email')
            .populate('items.product');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Customers routes
app.get('/api/admin/customers', authenticateToken, isAdmin, async (req, res) => {
    try {
        const customers = await User.find({ role: 'user' })
            .select('-password')
            .sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/customers/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const customer = await User.findById(req.params.id)
            .select('-password');
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.put('/api/admin/customers/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, status } = req.body;
        const customer = await User.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, email, phone, status },
            { new: true }
        ).select('-password');
        
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/admin/customers/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const customer = await User.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Fallback for undefined routes (404)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Deli Spi E-commerce server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});

// Handle server shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('Shutting down server...');
    mongoose.connection.close(false, () => {
        console.log('MongoDB connection closed.');
        process.exit(0);
    });
});
