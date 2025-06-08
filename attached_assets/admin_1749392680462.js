// Admin Dashboard Functionality
class AdminDashboard {
    constructor() {
        this.checkAuth();
    }

    checkAuth() {
        const token = localStorage.getItem('authToken');
        let user = null;
        
        try {
            const userStr = localStorage.getItem('user');
            if (!userStr) {
                throw new Error('No user data found');
            }
            user = JSON.parse(userStr);
        } catch (e) {
            console.error('Error parsing user data:', e);
            this.redirectToLogin();
            return;
        }
        
        // Check if user is authenticated and has admin role
        if (!token || !user || user.role?.toLowerCase() !== 'admin') {
            console.error('Authentication failed:', { 
                hasToken: !!token, 
                hasUser: !!user, 
                userRole: user?.role 
            });
            this.redirectToLogin();
            return;
        }
        
        // Update user info in the dashboard
        document.getElementById('adminName').textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById('adminEmail').textContent = user.email;
        
        // Load dashboard data after confirming authentication
        this.loadDashboardData();
    }

    redirectToLogin() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/user-account.html';
    }

    async loadDashboardData() {
        try {
            // Fetch dashboard statistics
            const stats = await this.fetchStats();
            this.updateDashboardStats(stats);

            // Fetch recent orders
            const orders = await this.fetchRecentOrders();
            this.updateRecentOrders(orders);

            // Fetch recent users
            const users = await this.fetchRecentUsers();
            this.updateRecentUsers(users);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            if (error.status === 401 || error.status === 403) {
                this.redirectToLogin();
                return;
            }
            this.showError('Failed to load dashboard data');
        }
    }

    async fetchStats() {
        const response = await fetch('/api/admin/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                this.redirectToLogin();
                return;
            }
            throw new Error('Failed to fetch stats');
        }
        return response.json();
    }

    async fetchRecentOrders() {
        const response = await fetch('/api/admin/orders/recent', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                this.redirectToLogin();
                return;
            }
            throw new Error('Failed to fetch recent orders');
        }
        return response.json();
    }

    async fetchRecentUsers() {
        const response = await fetch('/api/admin/users/recent', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                this.redirectToLogin();
                return;
            }
            throw new Error('Failed to fetch recent users');
        }
        return response.json();
    }

    updateDashboardStats(stats) {
        document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
        document.getElementById('totalRevenue').textContent = `$${stats.totalRevenue || 0}`;
        document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
        document.getElementById('totalProducts').textContent = stats.totalProducts || 0;
    }

    updateRecentOrders(orders) {
        const ordersList = document.getElementById('recentOrders');
        if (!ordersList) return;

        ordersList.innerHTML = orders.map(order => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">New Order #${order._id}</div>
                    <div class="activity-time">${new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div class="activity-amount">$${order.totalAmount}</div>
            </div>
        `).join('');
    }

    updateRecentUsers(users) {
        const usersList = document.getElementById('recentUsers');
        if (!usersList) return;

        usersList.innerHTML = users.map(user => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-user"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">${user.firstName} ${user.lastName}</div>
                    <div class="activity-time">${new Date(user.createdAt).toLocaleString()}</div>
                </div>
                <div class="activity-amount">${user.email}</div>
            </div>
        `).join('');
    }

    showError(message) {
        // Implement error notification
        console.error(message);
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/admin/admin-login.html';
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new AdminDashboard();
    
    // Add logout event listener
    document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        dashboard.logout();
    });
}); 