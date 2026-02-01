// ========== ADMIN DASHBOARD JAVASCRIPT ==========
// Real-time Corporate Dashboard for aZoom Car Rental

// Check if staff is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadDashboardData();
    
    // Real-time updates every second
    setInterval(loadDashboardData, 1000);
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', loadDashboardData);
});

// Check if admin/staff is authenticated
function checkAdminAuth() {
    // Check for currentAdmin (staff login from unified-auth.js)
    const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin'));
    
    if (!currentAdmin) {
        // Not logged in as staff, redirect to login
        alert('Please login as staff to access the admin dashboard.');
        window.location.href = 'login.html';
        return;
    }
    
    // Display staff name
    const staffNameElement = document.getElementById('staffName');
    if (staffNameElement) {
        staffNameElement.textContent = `Welcome, ${currentAdmin.firstName || currentAdmin.email}`;
    }
}

// ========== RESET ALL DATA FUNCTION ==========
function resetAllData() {
    // First, check for active rentals
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const activeRentals = bookings.filter(b => b.status === 'confirmed');
    
    if (activeRentals.length > 0) {
        // Warn about active rentals
        const activeWarning = confirm(
            `⚠️ WARNING: ACTIVE RENTALS DETECTED!\n\n` +
            `There are ${activeRentals.length} car(s) currently being rented:\n\n` +
            activeRentals.slice(0, 5).map(b => `• ${b.car} - ${b.userName || b.userEmail}`).join('\n') +
            (activeRentals.length > 5 ? `\n... and ${activeRentals.length - 5} more` : '') +
            `\n\nDo you want to:\n` +
            `• Click OK - Keep active rentals, clear only completed/cancelled\n` +
            `• Click Cancel - Go back (no changes)`
        );
        
        if (!activeWarning) return;
        
        // Partial reset - keep active rentals and their customers
        const confirmPartial = confirm(
            '🔶 PARTIAL RESET\n\n' +
            'This will:\n' +
            '✅ KEEP active rentals and their customers\n' +
            '❌ Clear returned/cancelled bookings\n' +
            '❌ Clear users with no active rentals\n\n' +
            'Click OK to proceed with partial reset.'
        );
        
        if (!confirmPartial) return;
        
        // Perform partial reset
        performPartialReset(activeRentals);
        return;
    }
    
    // No active rentals - offer full reset
    const confirmReset = confirm(
        '✅ NO ACTIVE RENTALS\n\n' +
        'All cars have been returned. Safe to reset!\n\n' +
        'This will clear:\n' +
        '• All bookings (returned/cancelled)\n' +
        '• All users\n' +
        '• Reset car stock levels\n\n' +
        'Click OK to proceed with full reset.'
    );
    
    if (!confirmReset) return;
    
    // Double confirmation for safety
    const doubleConfirm = confirm('🔴 FINAL CONFIRMATION\n\nClick OK to permanently reset all data.\nClick Cancel to abort.');
    if (!doubleConfirm) return;
    
    // Full reset
    performFullReset();
}

// Partial reset - keeps active rentals
function performPartialReset(activeRentals) {
    // Get current data
    const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
    
    // Get emails of users with active rentals
    const activeUserEmails = [...new Set(activeRentals.map(b => b.userEmail))];
    
    // Keep only users with active rentals
    const usersToKeep = users.filter(u => activeUserEmails.includes(u.email));
    
    // Save active rentals back
    localStorage.setItem('azoom_bookings', JSON.stringify(activeRentals));
    
    // Save users with active rentals
    localStorage.setItem('azoom_users', JSON.stringify(usersToKeep));
    
    // Don't reset stock - active rentals still have cars
    
    alert(
        '✅ Partial reset completed!\n\n' +
        `• Kept ${activeRentals.length} active rental(s)\n` +
        `• Kept ${usersToKeep.length} customer(s) with active rentals\n` +
        '• Cleared completed/cancelled bookings\n' +
        '• Stock levels preserved\n\n' +
        'The dashboard will now refresh.'
    );
    
    location.reload();
}

// Full reset - clears everything
function performFullReset() {
    // Clear bookings
    localStorage.removeItem('azoom_bookings');
    
    // Clear users
    localStorage.removeItem('azoom_users');
    
    // Clear all stock keys
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (key.startsWith('stock_')) {
            localStorage.removeItem(key);
        }
    });
    
    alert('✅ Full reset completed!\n\nAll data has been cleared.\nThe dashboard will now refresh.');
    
    location.reload();
}

// ========== GENERATE MONTHLY REPORT (PDF) ==========
function generateMonthlyReport() {
    // Get all data
    const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const cars = typeof getCars === 'function' ? getCars() : [];
    const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
    
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[today.getMonth()];
    const currentYear = today.getFullYear();
    
    // Calculate statistics
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const returnedBookings = bookings.filter(b => b.status === 'returned');
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
    
    // Revenue calculations
    const completedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'returned');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    
    // This month's data
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const thisMonthBookings = completedBookings.filter(b => b.bookingDate && b.bookingDate >= monthStartStr);
    const thisMonthRevenue = thisMonthBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    
    // This week's data
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const thisWeekBookings = completedBookings.filter(b => b.bookingDate && b.bookingDate >= weekStartStr);
    const thisWeekRevenue = thisWeekBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    
    // Fleet status
    let totalStock = 0;
    let availableStock = 0;
    cars.forEach(car => {
        const stockKey = 'stock_' + car.name;
        const storedStock = localStorage.getItem(stockKey);
        const currentStock = storedStock !== null ? parseInt(storedStock) : car.stock;
        totalStock += car.stock;
        availableStock += currentStock;
    });
    const rentedCount = totalStock - availableStock;
    
    // Popular cars
    const carBookingCounts = {};
    const carRevenue = {};
    bookings.forEach(booking => {
        const carName = booking.car || booking.carName;
        if (carName) {
            carBookingCounts[carName] = (carBookingCounts[carName] || 0) + 1;
            carRevenue[carName] = (carRevenue[carName] || 0) + (parseFloat(booking.total) || 0);
        }
    });
    const sortedCars = Object.entries(carBookingCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    
    // Format currency
    const formatCurrency = (amount) => `$${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    // Generate report HTML
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>aZoom Monthly Report - ${currentMonth} ${currentYear}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Arial, sans-serif; 
                    padding: 40px; 
                    color: #333;
                    line-height: 1.6;
                }
                .report-header {
                    text-align: center;
                    border-bottom: 3px solid #e74c3c;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .report-header h1 {
                    color: #1a1a2e;
                    font-size: 2.2em;
                    margin-bottom: 5px;
                }
                .report-header .subtitle {
                    color: #e74c3c;
                    font-size: 1.3em;
                    font-weight: 600;
                }
                .report-header .period {
                    color: #666;
                    margin-top: 10px;
                }
                .report-meta {
                    display: flex;
                    justify-content: space-between;
                    background: #f8f9fa;
                    padding: 15px 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    font-size: 0.9em;
                }
                .section {
                    margin-bottom: 35px;
                }
                .section h2 {
                    color: #1a1a2e;
                    border-bottom: 2px solid #e74c3c;
                    padding-bottom: 8px;
                    margin-bottom: 20px;
                    font-size: 1.4em;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                }
                .stat-box {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    text-align: center;
                    border-left: 4px solid #e74c3c;
                }
                .stat-box h3 {
                    font-size: 1.8em;
                    color: #1a1a2e;
                    margin-bottom: 5px;
                }
                .stat-box p {
                    color: #666;
                    font-size: 0.9em;
                }
                .revenue-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                }
                .revenue-box {
                    background: linear-gradient(135deg, #1a1a2e, #16213e);
                    color: white;
                    padding: 25px;
                    border-radius: 8px;
                    text-align: center;
                }
                .revenue-box h3 {
                    font-size: 1.6em;
                    color: #4caf50;
                    margin-bottom: 5px;
                }
                .revenue-box p {
                    color: #b0b0b0;
                    font-size: 0.85em;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                }
                th, td {
                    padding: 12px 15px;
                    text-align: left;
                    border-bottom: 1px solid #ddd;
                }
                th {
                    background: #1a1a2e;
                    color: white;
                    font-weight: 600;
                }
                tr:nth-child(even) {
                    background: #f8f9fa;
                }
                .status-confirmed { color: #27ae60; font-weight: 600; }
                .status-returned { color: #3498db; font-weight: 600; }
                .status-cancelled { color: #e74c3c; font-weight: 600; }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #eee;
                    text-align: center;
                    color: #666;
                    font-size: 0.85em;
                }
                .footer p { margin: 5px 0; }
                .no-print { margin-top: 30px; }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                    .stat-box, .revenue-box { break-inside: avoid; }
                }
                .highlight { background: #fff3cd; }
                .summary-row { font-weight: bold; background: #e8f5e9 !important; }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>🚗 aZoom Car Rental</h1>
                <div class="subtitle">Monthly Business Report</div>
                <div class="period">${currentMonth} ${currentYear}</div>
            </div>
            
            <div class="report-meta">
                <div><strong>Generated:</strong> ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${today.toLocaleTimeString()}</div>
                <div><strong>Generated by:</strong> ${currentAdmin.firstName || currentAdmin.email || 'Admin'}</div>
            </div>
            
            <div class="section">
                <h2>📊 Executive Summary</h2>
                <div class="stats-grid">
                    <div class="stat-box">
                        <h3>${users.length}</h3>
                        <p>Total Customers</p>
                    </div>
                    <div class="stat-box">
                        <h3>${bookings.length}</h3>
                        <p>Total Bookings</p>
                    </div>
                    <div class="stat-box">
                        <h3>${confirmedBookings.length}</h3>
                        <p>Active Rentals</p>
                    </div>
                    <div class="stat-box">
                        <h3>${availableStock}/${totalStock}</h3>
                        <p>Fleet Available</p>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>💰 Revenue Report</h2>
                <div class="revenue-grid">
                    <div class="revenue-box">
                        <h3>${formatCurrency(thisWeekRevenue)}</h3>
                        <p>This Week (${thisWeekBookings.length} bookings)</p>
                    </div>
                    <div class="revenue-box">
                        <h3>${formatCurrency(thisMonthRevenue)}</h3>
                        <p>This Month (${thisMonthBookings.length} bookings)</p>
                    </div>
                    <div class="revenue-box">
                        <h3>${formatCurrency(totalRevenue)}</h3>
                        <p>All Time (${completedBookings.length} bookings)</p>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2>📋 Booking Status Breakdown</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Count</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="status-confirmed">✅ Confirmed/Active</td>
                            <td>${confirmedBookings.length}</td>
                            <td>${bookings.length > 0 ? ((confirmedBookings.length / bookings.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                            <td class="status-returned">🔄 Returned</td>
                            <td>${returnedBookings.length}</td>
                            <td>${bookings.length > 0 ? ((returnedBookings.length / bookings.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr>
                            <td class="status-cancelled">❌ Cancelled</td>
                            <td>${cancelledBookings.length}</td>
                            <td>${bookings.length > 0 ? ((cancelledBookings.length / bookings.length) * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr class="summary-row">
                            <td>Total</td>
                            <td>${bookings.length}</td>
                            <td>100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>🏆 Top 5 Most Popular Vehicles</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Vehicle</th>
                            <th>Total Rentals</th>
                            <th>Revenue Generated</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedCars.length > 0 ? sortedCars.map(([carName, count], index) => `
                            <tr>
                                <td>${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</td>
                                <td>${carName}</td>
                                <td>${count}</td>
                                <td>${formatCurrency(carRevenue[carName] || 0)}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4" style="text-align: center; color: #999;">No booking data available</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>🚗 Fleet Status</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Fleet Size</td>
                            <td>${totalStock} vehicles</td>
                        </tr>
                        <tr>
                            <td>Currently Available</td>
                            <td>${availableStock} vehicles</td>
                        </tr>
                        <tr>
                            <td>Currently Rented</td>
                            <td>${rentedCount} vehicles</td>
                        </tr>
                        <tr>
                            <td>Utilization Rate</td>
                            <td>${totalStock > 0 ? ((rentedCount / totalStock) * 100).toFixed(1) : 0}%</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="section">
                <h2>📝 Recent Bookings</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Booking ID</th>
                            <th>Customer</th>
                            <th>Vehicle</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.slice(-10).reverse().map(b => `
                            <tr>
                                <td>#${b.id || 'N/A'}</td>
                                <td>${b.userName || b.userEmail || 'Guest'}</td>
                                <td>${b.car || b.carName || 'N/A'}</td>
                                <td>${b.bookingDate ? new Date(b.bookingDate).toLocaleDateString() : 'N/A'}</td>
                                <td>${formatCurrency(parseFloat(b.total) || 0)}</td>
                                <td class="status-${b.status}">${(b.status || 'pending').toUpperCase()}</td>
                            </tr>
                        `).join('') || '<tr><td colspan="6" style="text-align: center; color: #999;">No bookings recorded</td></tr>'}
                    </tbody>
                </table>
            </div>
            
            <div class="footer">
                <p><strong>aZoom Car Rental</strong> - Driving Towards a Greener Future 🌱</p>
                <p>Downtown: 123 Electric Ave, City Center | Airport: 456 Terminal Rd, Airport Plaza</p>
                <p>Contact: info@azoomcarrental.com | +1 (555) 123-4567</p>
                <p style="margin-top: 15px; font-style: italic;">This report was automatically generated by the aZoom Dashboard System</p>
            </div>
            
            <div class="no-print" style="text-align: center;">
                <button onclick="window.print()" style="padding: 15px 40px; background: #e74c3c; color: white; border: none; border-radius: 8px; font-size: 1.1em; cursor: pointer; margin-right: 10px;">
                    🖨️ Print / Save as PDF
                </button>
                <button onclick="window.close()" style="padding: 15px 40px; background: #6c757d; color: white; border: none; border-radius: 8px; font-size: 1.1em; cursor: pointer;">
                    ✖️ Close
                </button>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Admin/Staff Logout Function
function adminLogout() {
    // Clear admin from localStorage
    localStorage.removeItem('currentAdmin');
    
    // Show confirmation
    alert('You have been signed out successfully.');
    
    // Redirect to home page or login page
    window.location.href = 'index.html';
}

// Load dashboard statistics - COMPREHENSIVE REAL-TIME DATA
function loadDashboardData() {
    // Get all data sources
    const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const cars = typeof getCars === 'function' ? getCars() : [];
    
    const today = new Date().toISOString().split('T')[0];
    
    // ========== UPDATE STATS CARDS ==========
    
    // Total Users
    const totalUsersElement = document.getElementById('totalUsers');
    const newUsersTodayElement = document.getElementById('newUsersToday');
    if (totalUsersElement) {
        totalUsersElement.textContent = users.length;
    }
    if (newUsersTodayElement) {
        const todayUsers = users.filter(u => u.signupDate && u.signupDate.startsWith(today)).length;
        newUsersTodayElement.textContent = `+${todayUsers} today`;
    }
    
    // Total Bookings & Active Bookings
    const totalBookingsElement = document.getElementById('totalBookings');
    const activeBookingsElement = document.getElementById('activeBookings');
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    
    if (totalBookingsElement) {
        totalBookingsElement.textContent = bookings.length;
    }
    if (activeBookingsElement) {
        activeBookingsElement.textContent = `${confirmedBookings.length} active`;
    }
    
    // Fleet Status - Available vs Rented (based on actual stock)
    const activeFleetElement = document.getElementById('activeFleet');
    const fleetStatusElement = document.getElementById('fleetStatus');
    
    // Calculate total stock and available stock from cars data
    let totalStock = 0;
    let availableStock = 0;
    cars.forEach(car => {
        const stockKey = 'stock_' + car.name;
        const storedStock = localStorage.getItem(stockKey);
        const currentStock = storedStock !== null ? parseInt(storedStock) : car.stock;
        totalStock += car.stock; // Original total capacity
        availableStock += currentStock; // Current available
    });
    
    const rentedCount = totalStock - availableStock;
    
    if (activeFleetElement) {
        activeFleetElement.textContent = `${availableStock}/${totalStock}`;
    }
    if (fleetStatusElement) {
        fleetStatusElement.textContent = `${availableStock} available / ${rentedCount} rented`;
    }
    
    // Revenue Calculations
    const revenueElement = document.getElementById('revenue');
    const todayRevenueElement = document.getElementById('todayRevenue');
    
    // Calculate total revenue (only from confirmed and returned bookings)
    const completedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'returned');
    const totalRevenue = completedBookings.reduce((sum, booking) => {
        return sum + (parseFloat(booking.total) || 0);
    }, 0);
    
    // Today's revenue
    const todayBookings = bookings.filter(b => 
        b.bookingDate && b.bookingDate.startsWith(today) && 
        (b.status === 'confirmed' || b.status === 'returned')
    );
    const todayRevenue = todayBookings.reduce((sum, booking) => {
        return sum + (parseFloat(booking.total) || 0);
    }, 0);
    
    if (revenueElement) {
        revenueElement.textContent = `$${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    if (todayRevenueElement) {
        todayRevenueElement.textContent = `$${todayRevenue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} today`;
    }
    
    // ========== BOOKING STATUS OVERVIEW ==========
    updateBookingStatusCards(bookings, today);
    
    // ========== ALERTS - Overdue & Low Stock ==========
    updateAlerts(bookings, cars, today);
    
    // ========== REVENUE BREAKDOWN ==========
    updateRevenueBreakdown(bookings);
    
    // ========== POPULAR CARS ==========
    updatePopularCars(bookings, cars);
    
    // ========== UPDATE TABLES ==========
    loadUsersTable(users);
    loadBookingsTable(bookings);
    
    // ========== ACTIVITY FEED ==========
    updateActivityFeed(bookings, users);
    
    // ========== FLEET OVERVIEW ==========
    updateFleetOverview(cars, bookings);
    
    // ========== LAST UPDATED TIMESTAMP ==========
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
}

// Update Booking Status Cards
function updateBookingStatusCards(bookings, today) {
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const returned = bookings.filter(b => b.status === 'returned');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    const pendingPickup = confirmed.filter(b => b.pickupDate >= today);
    
    const confirmedCountEl = document.getElementById('confirmedCount');
    const returnedCountEl = document.getElementById('returnedCount');
    const cancelledCountEl = document.getElementById('cancelledCount');
    const pendingPickupEl = document.getElementById('pendingPickup');
    
    if (confirmedCountEl) confirmedCountEl.textContent = confirmed.length;
    if (returnedCountEl) returnedCountEl.textContent = returned.length;
    if (cancelledCountEl) cancelledCountEl.textContent = cancelled.length;
    if (pendingPickupEl) pendingPickupEl.textContent = pendingPickup.length;
}

// Load users into the table with delete actions
function loadUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    const userCountBadge = document.getElementById('userCountBadge');
    if (!tableBody) return;
    
    // Update user count badge
    if (userCountBadge) {
        userCountBadge.textContent = users.length;
    }
    
    // Get all bookings to count per user
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    
    // Show all users (most recent first)
    const allUsers = users.slice().reverse();
    
    if (allUsers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No users yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = allUsers.map((user, index) => {
        // Count bookings for this user
        const userBookings = bookings.filter(b => b.userEmail === user.email).length;
        
        return `
            <tr data-user-email="${user.email}">
                <td>#${user.id || (1000 + users.length - index)}</td>
                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                <td>${user.email}</td>
                <td><span class="tier-badge bronze">Bronze</span></td>
                <td>${user.signupDate ? new Date(user.signupDate).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <div class="user-actions">
                        <span class="booking-count" title="${userBookings} booking(s)">📋 ${userBookings}</span>
                        <button class="btn-delete-user" onclick="openDeleteUserModal('${user.id || (1000 + users.length - index)}', '${user.email}', '${(user.firstName || '') + ' ' + (user.lastName || '')}')" title="Delete User">
                            🗑️
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ========== USER MANAGEMENT - DELETE FUNCTIONALITY ==========
let userToDelete = null;

// Open delete confirmation modal
function openDeleteUserModal(userId, userEmail, userName) {
    userToDelete = { id: userId, email: userEmail, name: userName.trim() };
    
    const modal = document.getElementById('deleteUserModal');
    const userInfo = document.getElementById('userToDeleteInfo');
    
    if (userInfo) {
        userInfo.innerHTML = `
            <p><strong>User ID:</strong> #${userId}</p>
            <p><strong>Name:</strong> ${userName.trim() || 'N/A'}</p>
            <p><strong>Email:</strong> ${userEmail}</p>
        `;
    }
    
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteUserModal');
    if (modal) {
        modal.style.display = 'none';
    }
    userToDelete = null;
}

// Confirm and delete user
function confirmDeleteUser() {
    if (!userToDelete) return;
    
    const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
    
    // Find and remove the user
    const userIndex = users.findIndex(u => u.email === userToDelete.email);
    
    if (userIndex === -1) {
        alert('User not found!');
        closeDeleteModal();
        return;
    }
    
    // Remove user from array
    users.splice(userIndex, 1);
    
    // Save back to localStorage
    localStorage.setItem('azoom_users', JSON.stringify(users));
    
    // Close modal and refresh
    closeDeleteModal();
    
    // Show success message
    alert(`User "${userToDelete.name || userToDelete.email}" has been deleted successfully.`);
    
    // Refresh dashboard data
    loadDashboardData();
}

// ========== SIDEBAR NAVIGATION ==========
let isScrolling = false; // Debounce flag to prevent rapid clicking issues

function scrollToSection(sectionId) {
    // Debounce - prevent rapid multiple clicks from causing issues
    if (isScrolling) {
        console.log('Scroll in progress, ignoring click');
        return;
    }
    
    isScrolling = true;
    
    if (sectionId === 'top') {
        // Scroll to top of page
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Reset debounce flag after scroll animation completes (500ms)
    setTimeout(() => {
        isScrolling = false;
    }, 500);
}

// Set active state on sidebar navigation
function setActiveNav(clickedElement) {
    // Remove active class from all nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    clickedElement.classList.add('active');
}

// Load bookings into table
function loadBookingsTable(bookings) {
    const tableBody = document.getElementById('bookingsTableBody');
    if (!tableBody) return;
    
    // Get recent 5 bookings
    const recentBookings = bookings.slice(-5).reverse();
    
    if (recentBookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #999;">No bookings yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = recentBookings.map(booking => {
        const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 
                           booking.status === 'returned' ? 'status-returned' : 'status-cancelled';
        return `
            <tr>
                <td>#${booking.id || 'N/A'}</td>
                <td>${booking.userName || booking.userEmail || 'Guest'}</td>
                <td>${booking.car || 'N/A'}</td>
                <td><span class="booking-status ${statusClass}">${booking.status || 'pending'}</span></td>
                <td>$${parseFloat(booking.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    }).join('');
}

// Update Activity Feed - Real-time log of events
function updateActivityFeed(bookings, users) {
    const feedContainer = document.getElementById('activityFeed');
    if (!feedContainer) return;
    
    const activities = [];
    
    // Add booking activities
    bookings.forEach(booking => {
        const time = booking.bookingDate ? new Date(booking.bookingDate) : new Date();
        activities.push({
            type: 'booking',
            icon: booking.status === 'returned' ? '✅' : booking.status === 'cancelled' ? '❌' : '🚗',
            text: booking.status === 'returned' 
                ? `${booking.userName || 'Customer'} returned ${booking.car}`
                : booking.status === 'cancelled'
                ? `Booking cancelled: ${booking.car}`
                : `${booking.userName || 'Customer'} booked ${booking.car}`,
            time: time,
            status: booking.status
        });
    });
    
    // Add user signup activities
    users.forEach(user => {
        const time = user.signupDate ? new Date(user.signupDate) : new Date();
        activities.push({
            type: 'user',
            icon: '👤',
            text: `New user registered: ${user.firstName || ''} ${user.lastName || ''}`.trim() || `New user: ${user.email}`,
            time: time
        });
    });
    
    // Sort by time (most recent first) and take top 8
    activities.sort((a, b) => b.time - a.time);
    const recentActivities = activities.slice(0, 8);
    
    if (recentActivities.length === 0) {
        feedContainer.innerHTML = `
            <div class="activity-item">
                <span class="activity-icon">📭</span>
                <span class="activity-text">No recent activity</span>
            </div>
        `;
        return;
    }
    
    feedContainer.innerHTML = recentActivities.map(activity => `
        <div class="activity-item ${activity.type}">
            <span class="activity-icon">${activity.icon}</span>
            <span class="activity-text">${activity.text}</span>
            <span class="activity-time">${formatTimeAgo(activity.time)}</span>
        </div>
    `).join('');
}

// Format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}

// Update Fleet Overview - Show each car's stock status
function updateFleetOverview(cars, bookings) {
    const fleetGrid = document.getElementById('fleetGrid');
    if (!fleetGrid) return;
    
    // Show ALL cars with their actual stock
    fleetGrid.innerHTML = cars.map(car => {
        // Get actual stock from localStorage
        const stockKey = 'stock_' + car.name;
        const storedStock = localStorage.getItem(stockKey);
        const currentStock = storedStock !== null ? parseInt(storedStock) : car.stock;
        const originalStock = car.stock;
        const rentedCount = originalStock - currentStock;
        
        const isAvailable = currentStock > 0;
        const statusClass = isAvailable ? 'available' : 'rented';
        const statusText = isAvailable ? `${currentStock} Available` : 'All Rented';
        
        return `
            <div class="fleet-card ${statusClass}">
                <img src="${car.image}" alt="${car.name}" class="fleet-car-image">
                <div class="fleet-car-info">
                    <h4>${car.name}</h4>
                    <p>$${car.price}/day</p>
                    <div class="stock-info">
                        <span class="stock-available">${currentStock}</span>/<span class="stock-total">${originalStock}</span> in stock
                    </div>
                    <span class="fleet-status ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Quick action functions
function viewUsers() {
    alert('View Users feature coming soon!');
}

function viewBookings() {
    alert('View Bookings feature coming soon!');
}

function manageFleet() {
    alert('Manage Fleet feature coming soon!');
}

function viewReports() {
    alert('View Reports feature coming soon!');
}

// ========== ALERTS SYSTEM - Overdue Rentals & Low Stock ==========
function updateAlerts(bookings, cars, today) {
    const overdueAlert = document.getElementById('overdueAlert');
    const lowStockAlert = document.getElementById('lowStockAlert');
    const noAlertsMessage = document.getElementById('noAlertsMessage');
    const overdueList = document.getElementById('overdueList');
    const lowStockList = document.getElementById('lowStockList');
    const overdueCount = document.getElementById('overdueCount');
    const lowStockCount = document.getElementById('lowStockCount');
    
    if (!overdueAlert || !lowStockAlert) return;
    
    // Find overdue rentals (confirmed bookings where pickup date + rental days < today)
    const overdueBookings = bookings.filter(b => {
        if (b.status !== 'confirmed') return false;
        const pickupDate = new Date(b.pickupDate);
        const totalDays = parseInt(b.totalDays) || 1;
        const expectedReturnDate = new Date(pickupDate);
        expectedReturnDate.setDate(expectedReturnDate.getDate() + totalDays);
        return expectedReturnDate < new Date(today);
    });
    
    // Find low stock cars (stock < 2)
    const lowStockCars = cars.filter(car => {
        const stockKey = 'stock_' + car.name;
        const storedStock = localStorage.getItem(stockKey);
        const currentStock = storedStock !== null ? parseInt(storedStock) : car.stock;
        return currentStock < 2;
    });
    
    let hasAlerts = false;
    
    // Update Overdue Alerts
    if (overdueBookings.length > 0) {
        hasAlerts = true;
        overdueAlert.style.display = 'block';
        overdueCount.textContent = overdueBookings.length;
        overdueList.innerHTML = overdueBookings.map(b => {
            const pickupDate = new Date(b.pickupDate);
            const totalDays = parseInt(b.totalDays) || 1;
            const expectedReturn = new Date(pickupDate);
            expectedReturn.setDate(expectedReturn.getDate() + totalDays);
            const daysOverdue = Math.floor((new Date() - expectedReturn) / (1000 * 60 * 60 * 24));
            
            return `
                <div class="alert-item">
                    <span class="alert-car">${b.car}</span>
                    <span class="alert-customer">${b.userName || b.userEmail}</span>
                    <span class="alert-overdue-days">${daysOverdue} day(s) overdue</span>
                </div>
            `;
        }).join('');
    } else {
        overdueAlert.style.display = 'none';
    }
    
    // Update Low Stock Alerts
    if (lowStockCars.length > 0) {
        hasAlerts = true;
        lowStockAlert.style.display = 'block';
        lowStockCount.textContent = lowStockCars.length;
        lowStockList.innerHTML = lowStockCars.map(car => {
            const stockKey = 'stock_' + car.name;
            const storedStock = localStorage.getItem(stockKey);
            const currentStock = storedStock !== null ? parseInt(storedStock) : car.stock;
            const stockClass = currentStock === 0 ? 'out-of-stock' : 'low';
            
            return `
                <div class="alert-item ${stockClass}">
                    <span class="alert-car">${car.name}</span>
                    <span class="alert-stock">${currentStock === 0 ? 'OUT OF STOCK' : `Only ${currentStock} left`}</span>
                </div>
            `;
        }).join('');
    } else {
        lowStockAlert.style.display = 'none';
    }
    
    // Show/hide no alerts message
    if (noAlertsMessage) {
        noAlertsMessage.style.display = hasAlerts ? 'none' : 'flex';
    }
}

// ========== REVENUE BREAKDOWN ==========
function updateRevenueBreakdown(bookings) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Get week start (Sunday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    // Get month start
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    // Filter completed bookings only
    const completedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'returned');
    
    // Calculate revenues
    const todayBookings = completedBookings.filter(b => b.bookingDate && b.bookingDate.startsWith(todayStr));
    const weekBookings = completedBookings.filter(b => b.bookingDate && b.bookingDate >= weekStartStr);
    const monthBookings = completedBookings.filter(b => b.bookingDate && b.bookingDate >= monthStartStr);
    
    const todayRevenue = todayBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    const weekRevenue = weekBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    const monthRevenue = monthBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    const allTimeRevenue = completedBookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    
    // Update UI
    const formatCurrency = (amount) => `$${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const revenueTodayCard = document.getElementById('revenueTodayCard');
    const revenueWeekCard = document.getElementById('revenueWeekCard');
    const revenueMonthCard = document.getElementById('revenueMonthCard');
    const revenueAllTimeCard = document.getElementById('revenueAllTimeCard');
    const bookingsTodayCard = document.getElementById('bookingsTodayCard');
    const bookingsWeekCard = document.getElementById('bookingsWeekCard');
    const bookingsMonthCard = document.getElementById('bookingsMonthCard');
    const bookingsAllTimeCard = document.getElementById('bookingsAllTimeCard');
    
    if (revenueTodayCard) revenueTodayCard.textContent = formatCurrency(todayRevenue);
    if (revenueWeekCard) revenueWeekCard.textContent = formatCurrency(weekRevenue);
    if (revenueMonthCard) revenueMonthCard.textContent = formatCurrency(monthRevenue);
    if (revenueAllTimeCard) revenueAllTimeCard.textContent = formatCurrency(allTimeRevenue);
    
    if (bookingsTodayCard) bookingsTodayCard.textContent = `${todayBookings.length} bookings`;
    if (bookingsWeekCard) bookingsWeekCard.textContent = `${weekBookings.length} bookings`;
    if (bookingsMonthCard) bookingsMonthCard.textContent = `${monthBookings.length} bookings`;
    if (bookingsAllTimeCard) bookingsAllTimeCard.textContent = `${completedBookings.length} bookings`;
}

// Revenue period tab switching
function showRevenuePeriod(period) {
    // Update active tab
    document.querySelectorAll('.revenue-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    // Tab logic could show different charts/details - for now just visual feedback
}

// ========== POPULAR CARS REPORT ==========
function updatePopularCars(bookings, cars) {
    const popularCarsGrid = document.getElementById('popularCarsGrid');
    if (!popularCarsGrid) return;
    
    // Count bookings per car
    const carBookingCounts = {};
    const carRevenue = {};
    
    bookings.forEach(booking => {
        const carName = booking.car || booking.carName;
        if (carName) {
            carBookingCounts[carName] = (carBookingCounts[carName] || 0) + 1;
            carRevenue[carName] = (carRevenue[carName] || 0) + (parseFloat(booking.total) || 0);
        }
    });
    
    // Sort by booking count
    const sortedCars = Object.entries(carBookingCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5
    
    if (sortedCars.length === 0) {
        popularCarsGrid.innerHTML = '<div class="no-data">No booking data yet to determine popular cars.</div>';
        return;
    }
    
    const maxBookings = sortedCars[0][1];
    
    popularCarsGrid.innerHTML = sortedCars.map(([carName, count], index) => {
        const car = cars.find(c => c.name === carName) || {};
        const revenue = carRevenue[carName] || 0;
        const percentage = Math.round((count / maxBookings) * 100);
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        
        return `
            <div class="popular-car-card">
                <div class="popular-rank">${medal}</div>
                <div class="popular-car-info">
                    <h4>${carName}</h4>
                    <div class="popular-stats">
                        <span class="popular-bookings">${count} rentals</span>
                        <span class="popular-revenue">$${revenue.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div class="popularity-bar">
                        <div class="popularity-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
