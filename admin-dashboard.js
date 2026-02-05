// ========== ADMIN DASHBOARD JAVASCRIPT ==========
// Real-time Corporate Dashboard for aZoom Car Rental

// Track which booking is currently being inspected (to preserve state during refresh)
let activeInspectionId = null;

// Track last activity time and previous data for change detection
let lastActivityTime = Date.now();
let previousDataSnapshot = { users: 0, bookings: 0, bookingsData: '' };

// Check if staff is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadDashboardData();
    
    // Real-time updates every 3 seconds (increased to avoid interrupting inspections)
    setInterval(loadDashboardData, 3000);
    
    // Update "seconds ago" display every second
    setInterval(updateLastActivityDisplay, 1000);
    
    // Listen for storage changes from other tabs
    window.addEventListener('storage', loadDashboardData);
});

// Update the "X seconds ago" display
function updateLastActivityDisplay() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        const secondsAgo = Math.floor((Date.now() - lastActivityTime) / 1000);
        if (secondsAgo < 60) {
            lastUpdatedElement.textContent = `Last activity: ${secondsAgo}s ago`;
        } else if (secondsAgo < 3600) {
            const minutes = Math.floor(secondsAgo / 60);
            lastUpdatedElement.textContent = `Last activity: ${minutes}m ago`;
        } else {
            const hours = Math.floor(secondsAgo / 3600);
            lastUpdatedElement.textContent = `Last activity: ${hours}h ago`;
        }
    }
}

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
        
        // Partial reset - keep active rentals
        const confirmPartial = confirm(
            '🔶 PARTIAL RESET\n\n' +
            'This will:\n' +
            '✅ KEEP active rentals\n' +
            '✅ KEEP all user accounts (manage users manually)\n' +
            '❌ Clear returned/cancelled bookings\n\n' +
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
        '• Reset car stock levels\n\n' +
        '⚠️ User accounts will NOT be deleted.\n' +
        'Manage users manually in User Management section.\n\n' +
        'Click OK to proceed with reset.'
    );
    
    if (!confirmReset) return;
    
    // Double confirmation for safety
    const doubleConfirm = confirm('🔴 FINAL CONFIRMATION\n\nClick OK to permanently reset booking data.\nUser accounts will be preserved.\nClick Cancel to abort.');
    if (!doubleConfirm) return;
    
    // Full reset
    performFullReset();
}

// Partial reset - keeps active rentals and all users
function performPartialReset(activeRentals) {
    // Save active rentals back (keep only active, remove completed/cancelled)
    localStorage.setItem('azoom_bookings', JSON.stringify(activeRentals));
    
    // Don't reset stock - active rentals still have cars
    // Don't touch users - manage manually
    
    alert(
        '✅ Partial reset completed!\n\n' +
        `• Kept ${activeRentals.length} active rental(s)\n` +
        '• All user accounts preserved\n' +
        '• Cleared completed/cancelled bookings\n' +
        '• Stock levels preserved\n\n' +
        'The dashboard will now refresh.'
    );
    
    location.reload();
}

// Full reset - clears bookings and stock, but NOT users
function performFullReset() {
    // Clear bookings
    localStorage.removeItem('azoom_bookings');
    
    // Clear damage requests
    localStorage.removeItem('azoom_damage_requests');
    
    // Clear all stock keys (reset to default)
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
        if (key.startsWith('stock_')) {
            localStorage.removeItem(key);
        }
    });
    
    // Do NOT clear users - manage manually via User Management
    
    alert('✅ Reset completed!\n\n• All bookings cleared\n• Stock levels reset\n• User accounts preserved\n\nManage users manually in User Management section.\nThe dashboard will now refresh.');
    
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
        const originalStock = car.originalStock || car.stock; // Use original stock from data.js
        const currentStock = storedStock !== null ? parseInt(storedStock) : originalStock;
        totalStock += originalStock;
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
            <title>AZoom Monthly Report - ${currentMonth} ${currentYear}</title>
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
                <h1>🚗 AZoom Car Rental</h1>
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
                <p><strong>AZoom Car Rental</strong> - Driving Towards a Greener Future 🌱</p>
                <p>Storhub Management Pte Ltd, 615 Lorong 4 Toa Payoh</p>
                <p>Contact: info@azoomcarrental.com | +65 8682 8785</p>
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
    
    // Fleet Status - Available vs Rented (based on pickup datetime, not stock)
    const activeFleetElement = document.getElementById('activeFleet');
    const fleetStatusElement = document.getElementById('fleetStatus');
    
    // Calculate total stock from cars data (original capacity from data.js)
    let totalStock = 0;
    cars.forEach(car => {
        totalStock += car.originalStock || car.stock; // Use originalStock if available
    });
    
    // Count confirmed bookings by pickup datetime status
    const now = new Date();
    
    // Actually rented: pickup datetime has passed (customer has the car)
    const actuallyRented = confirmedBookings.filter(b => {
        const pickupDateTime = getPickupDateTime(b);
        return pickupDateTime <= now;
    }).length;
    
    // Pending pickup: pickup datetime hasn't passed yet (car reserved but not picked up)
    // These cars are still physically at the shop!
    const pendingPickupCount = confirmedBookings.filter(b => {
        const pickupDateTime = getPickupDateTime(b);
        return pickupDateTime > now;
    }).length;
    
    // Real available = total stock - actually rented (cars that left the shop)
    // Pending bookings don't reduce availability since car is still here
    const realAvailable = totalStock - actuallyRented;
    
    if (activeFleetElement) {
        // Show real availability: cars physically at the shop
        activeFleetElement.textContent = `${realAvailable}/${totalStock}`;
    }
    if (fleetStatusElement) {
        // Show breakdown: available / actually rented / pending pickup
        if (pendingPickupCount > 0) {
            fleetStatusElement.textContent = `${realAvailable} available / ${actuallyRented} rented / ${pendingPickupCount} pending`;
        } else {
            fleetStatusElement.textContent = `${realAvailable} available / ${actuallyRented} rented`;
        }
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
    
    // ========== CAR INSPECTIONS ==========
    loadInspections();
    
    // ========== DETECT CHANGES & UPDATE ACTIVITY TIMER ==========
    const currentSnapshot = {
        users: users.length,
        bookings: bookings.length,
        bookingsData: JSON.stringify(bookings.map(b => ({ id: b.id, status: b.status })))
    };
    
    // Check if data has changed (new user, new booking, status change, etc.)
    if (currentSnapshot.users !== previousDataSnapshot.users ||
        currentSnapshot.bookings !== previousDataSnapshot.bookings ||
        currentSnapshot.bookingsData !== previousDataSnapshot.bookingsData) {
        
        // Data changed! Reset the activity timer
        lastActivityTime = Date.now();
        previousDataSnapshot = currentSnapshot;
    }
    
    // Update the display immediately
    updateLastActivityDisplay();
}

// Helper function to create DateTime from booking's date and time
function getPickupDateTime(booking) {
    const pickupDate = booking.pickupDate || '';
    const pickupTime = booking.pickupTime || '00:00';
    // Create datetime: "2026-02-05" + "T" + "10:00" -> "2026-02-05T10:00"
    return new Date(`${pickupDate}T${pickupTime}`);
}

// Update Booking Status Cards
function updateBookingStatusCards(bookings, today) {
    const now = new Date(); // Current date AND time
    const confirmed = bookings.filter(b => b.status === 'confirmed');
    const returned = bookings.filter(b => b.status === 'returned');
    const cancelled = bookings.filter(b => b.status === 'cancelled');
    
    // Pending refunds: cancelled bookings that haven't been refunded yet
    const pendingRefunds = cancelled.filter(b => !b.refunded);
    const refundedCount = cancelled.filter(b => b.refunded).length;
    
    // Pending Pickup: confirmed bookings where pickup date+time is in the future
    const pendingPickup = confirmed.filter(b => {
        const pickupDateTime = getPickupDateTime(b);
        return pickupDateTime > now; // Pickup datetime hasn't passed yet
    });
    
    const confirmedCountEl = document.getElementById('confirmedCount');
    const returnedCountEl = document.getElementById('returnedCount');
    const cancelledCountEl = document.getElementById('cancelledCount');
    const pendingPickupEl = document.getElementById('pendingPickup');
    const cancelledDescEl = document.querySelector('.status-card.cancelled .status-desc');
    
    if (confirmedCountEl) confirmedCountEl.textContent = confirmed.length;
    if (returnedCountEl) returnedCountEl.textContent = returned.length;
    if (cancelledCountEl) cancelledCountEl.textContent = cancelled.length;
    if (pendingPickupEl) pendingPickupEl.textContent = pendingPickup.length;
    
    // Update cancelled description to show pending refunds
    if (cancelledDescEl) {
        if (pendingRefunds.length > 0) {
            cancelledDescEl.innerHTML = `<span style="color: #e74c3c; font-weight: bold;">⚠️ ${pendingRefunds.length} pending refund${pendingRefunds.length > 1 ? 's' : ''}</span>`;
        } else {
            cancelledDescEl.textContent = 'All refunded';
        }
    }
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
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No bookings yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = recentBookings.map(booking => {
        const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 
                           booking.status === 'returned' ? 'status-returned' : 'status-cancelled';
        
        let actionBtn = '-';
        if (booking.status === 'confirmed') {
            // Confirmed = car is out, show "Mark Returned" button
            actionBtn = `<button class="btn-mark-returned" onclick="markAsReturned('${booking.id}')" title="Customer returned the car">Return</button>`;
        } else if (booking.status === 'returned') {
            // Returned = check if inspected
            if (booking.inspection) {
                // Inspected
                actionBtn = booking.inspection.hasDamage 
                    ? `<span class="condition-badge condition-damaged">⚠️ Damage</span>`
                    : `<span class="condition-badge condition-excellent">✅ OK</span>`;
            } else {
                // Awaiting inspection - scroll to inspection section
                actionBtn = `<button class="btn-inspect" onclick="scrollToInspectionSection()" title="Go to inspection section">🔍 Inspect</button>`;
            }
        } else if (booking.status === 'cancelled') {
            // Cancelled = check if refunded
            if (booking.refunded) {
                actionBtn = `<span class="condition-badge condition-excellent">💰 Refunded</span>`;
            } else {
                actionBtn = `<button class="btn-refund" onclick="processRefund('${booking.id}')" title="Process refund for customer">💰 Processing Refund</button>`;
            }
        }
        
        return `
            <tr>
                <td>#${booking.id || 'N/A'}</td>
                <td>${booking.userName || booking.userEmail || 'Guest'}</td>
                <td>${booking.car || 'N/A'}</td>
                <td><span class="booking-status ${statusClass}">${booking.status || 'pending'}</span></td>
                <td>$${parseFloat(booking.finalBill || booking.total || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
                <td>${actionBtn}</td>
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

// ========== CAR INSPECTION & DAMAGE BILLING ==========

// Scroll to inspection section
function scrollToInspectionSection() {
    const inspectionSection = document.getElementById('inspectionSection');
    if (inspectionSection) {
        inspectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Add a brief highlight effect
        inspectionSection.style.transition = 'box-shadow 0.3s';
        inspectionSection.style.boxShadow = '0 0 20px rgba(231, 76, 60, 0.5)';
        setTimeout(() => {
            inspectionSection.style.boxShadow = 'none';
        }, 2000);
    }
}

// Load pending inspections (returned cars that need inspection)
function loadInspections() {
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    
    // Pending inspections: returned cars that haven't been inspected yet
    const pendingInspections = bookings.filter(b => b.status === 'returned' && !b.inspection);
    
    // Completed inspections: returned bookings with inspection data
    const completedInspections = bookings.filter(b => b.status === 'returned' && b.inspection);
    
    updatePendingInspectionsTable(pendingInspections);
    updateCompletedInspectionsTable(completedInspections);
}

function updatePendingInspectionsTable(inspections) {
    const tbody = document.getElementById('pendingInspectionsBody');
    if (!tbody) return;
    
    if (inspections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No cars awaiting inspection</td></tr>';
        return;
    }
    
    tbody.innerHTML = inspections.map(booking => {
        // Check for returnedAt (from admin) or returnDate (from customer)
        const returnedDate = booking.returnedAt 
            ? new Date(booking.returnedAt).toLocaleDateString() 
            : booking.returnDate 
                ? new Date(booking.returnDate).toLocaleDateString()
                : 'N/A';
        
        // Check if this booking is actively being inspected
        const isActiveInspection = String(activeInspectionId) === String(booking.id);
        
        const actionContent = isActiveInspection 
            ? `<div class="inspection-options">
                    <button class="btn-no-damage-small" onclick="completeInspectionNoDamage('${booking.id}')">
                        ✅ No Damage
                    </button>
                    <button class="btn-damage-small" onclick="showDamagePrompt('${booking.id}')">
                        ⚠️ Damage Found
                    </button>
                    <button class="btn-cancel-small" onclick="cancelInspection('${booking.id}')">
                        ✖
                    </button>
                </div>`
            : `<button class="btn-inspect" onclick="showInspectionOptions('${booking.id}')">
                    ✅ Inspect Done
                </button>`;
        
        return `
            <tr id="inspection-row-${booking.id}">
                <td>#${booking.id}</td>
                <td>${booking.userName || booking.userEmail || 'N/A'}</td>
                <td>${booking.car || booking.carName}</td>
                <td>${returnedDate}</td>
                <td>$${parseFloat(booking.total || 0).toFixed(2)}</td>
                <td class="inspection-actions" id="actions-${booking.id}">
                    ${actionContent}
                </td>
            </tr>
        `;
    }).join('');
}

// Show inspection options (No Damage / Damage Found buttons)
function showInspectionOptions(bookingId) {
    // Track this as active inspection
    activeInspectionId = bookingId;
    
    const actionsCell = document.getElementById('actions-' + bookingId);
    if (!actionsCell) return;
    
    actionsCell.innerHTML = `
        <div class="inspection-options">
            <button class="btn-no-damage-small" onclick="completeInspectionNoDamage('${bookingId}')">
                ✅ No Damage
            </button>
            <button class="btn-damage-small" onclick="showDamagePrompt('${bookingId}')">
                ⚠️ Damage Found
            </button>
            <button class="btn-cancel-small" onclick="cancelInspection('${bookingId}')">
                ✖
            </button>
        </div>
    `;
}

// Cancel inspection and go back to inspect button
function cancelInspection(bookingId) {
    // Clear active inspection tracking
    activeInspectionId = null;
    
    const actionsCell = document.getElementById('actions-' + bookingId);
    if (!actionsCell) return;
    
    actionsCell.innerHTML = `
        <button class="btn-inspect" onclick="showInspectionOptions('${bookingId}')">
            ✅ Inspect Done
        </button>
    `;
}

// Show damage prompt using browser prompts
function showDamagePrompt(bookingId) {
    const damageComment = prompt('What was damaged? (Describe the damage):');
    if (damageComment === null) return; // User cancelled
    
    if (!damageComment.trim()) {
        alert('Please describe what was damaged.');
        return;
    }
    
    const damageAmountStr = prompt('Enter the damage charge amount ($):');
    if (damageAmountStr === null) return; // User cancelled
    
    const damageAmount = parseFloat(damageAmountStr);
    if (isNaN(damageAmount) || damageAmount <= 0) {
        alert('Please enter a valid damage amount.');
        return;
    }
    
    // Confirm before sending
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const booking = bookings.find(b => String(b.id) === String(bookingId));
    
    if (!booking) {
        alert('Booking not found!');
        return;
    }
    
    if (!confirm(`Send damage bill to customer?\n\nDamage Charge: $${damageAmount.toFixed(2)}\n\nDamage: ${damageComment}`)) {
        return;
    }
    
    // Process the damage inspection
    sendDamageBillToCustomer(bookingId, damageComment, damageAmount);
}

// Complete inspection with NO damage
function completeInspectionNoDamage(bookingId) {
    if (!confirm('Confirm: No damage found?\n\nThe rental will be marked as complete.')) return;
    
    // Clear active inspection tracking
    activeInspectionId = null;
    
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const bookingIndex = bookings.findIndex(b => String(b.id) === String(bookingId));
    
    if (bookingIndex === -1) {
        alert('Booking not found!');
        return;
    }
    
    const booking = bookings[bookingIndex];
    
    // Update booking with inspection data - no damage
    booking.inspection = {
        hasDamage: false,
        damageCharge: 0,
        inspectedAt: new Date().toISOString(),
        inspectedBy: JSON.parse(localStorage.getItem('currentAdmin'))?.email || 'staff'
    };
    
    // Save updated bookings
    localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
    
    // Refresh dashboard
    loadDashboardData();
    
    alert('✅ Inspection completed!\n\nNo damage found. Rental is complete.');
}

// Send damage bill to customer
function sendDamageBillToCustomer(bookingId, damageComment, damageAmount) {
    // Clear active inspection tracking
    activeInspectionId = null;
    
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const bookingIndex = bookings.findIndex(b => String(b.id) === String(bookingId));
    
    if (bookingIndex === -1) {
        alert('Booking not found!');
        return;
    }
    
    const booking = bookings[bookingIndex];
    
    // Update booking with inspection data - damage found
    booking.inspection = {
        hasDamage: true,
        damageDescription: damageComment,
        damageCharge: damageAmount,
        damagePaid: false,
        inspectedAt: new Date().toISOString(),
        inspectedBy: JSON.parse(localStorage.getItem('currentAdmin'))?.email || 'staff'
    };
    booking.finalBill = damageAmount;
    
    // Create damage payment request for customer
    const damageRequests = JSON.parse(localStorage.getItem('azoom_damage_requests') || '[]');
    damageRequests.push({
        id: 'DMG-' + Date.now(),
        bookingId: booking.id,
        userEmail: booking.userEmail,
        userName: booking.userName,
        car: booking.car || booking.carName,
        damageDescription: damageComment,
        damageCharge: damageAmount,
        totalBill: damageAmount,
        status: 'pending',
        createdAt: new Date().toISOString()
    });
    localStorage.setItem('azoom_damage_requests', JSON.stringify(damageRequests));
    
    // Save updated bookings
    localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
    
    // Refresh dashboard
    loadDashboardData();
    
    alert(`✅ Damage bill sent to customer!\n\nDamage: ${damageComment}\nDamage Charge: $${damageAmount.toFixed(2)}\n\nThe customer will see this in their My Bookings page.`);
}

function updateCompletedInspectionsTable(inspections) {
    const tbody = document.getElementById('completedInspectionsBody');
    if (!tbody) return;
    
    if (inspections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No completed inspections</td></tr>';
        return;
    }
    
    tbody.innerHTML = inspections.slice(-10).reverse().map(booking => {
        const inspection = booking.inspection || {};
        const hasDamage = inspection.hasDamage;
        const damageCharge = parseFloat(inspection.damageCharge || 0);
        
        const statusBadge = hasDamage 
            ? `<span class="condition-badge condition-damaged">⚠️ Damage Found</span>`
            : `<span class="condition-badge condition-excellent">✅ No Damage</span>`;
        
        const damageDisplay = hasDamage 
            ? `<span class="damage-charge">$${damageCharge.toFixed(2)}</span>` 
            : '<span class="no-damage">-</span>';
        
        const paymentStatus = hasDamage 
            ? (inspection.damagePaid 
                ? '<span class="payment-status paid">✅ Paid</span>' 
                : '<span class="payment-status pending">⏳ Pending</span>')
            : '-';
        
        return `
            <tr>
                <td>#${booking.id}</td>
                <td>${booking.userName || booking.userEmail || 'N/A'}</td>
                <td>${booking.car || booking.carName}</td>
                <td>${statusBadge}</td>
                <td>${damageDisplay}</td>
                <td>${paymentStatus}</td>
            </tr>
        `;
    }).join('');
}

function getConditionBadge(condition) {
    const badges = {
        'excellent': '<span class="condition-badge condition-excellent">✅ Excellent</span>',
        'good': '<span class="condition-badge condition-good">👍 Good</span>',
        'damaged': '<span class="condition-badge condition-damaged">⚠️ Damaged</span>',
        'severe': '<span class="condition-badge condition-severe">🚨 Severe</span>'
    };
    return badges[condition] || '<span class="condition-badge">Unknown</span>';
}

// Mark car as returned (customer returns the car)
function markAsReturned(bookingId) {
    if (!confirm('Mark this car as returned?\n\nThe car will be added to the inspection queue.')) return;
    
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const bookingIndex = bookings.findIndex(b => String(b.id) === String(bookingId));
    
    if (bookingIndex === -1) {
        alert('Booking not found!');
        return;
    }
    
    const booking = bookings[bookingIndex];
    
    // Update booking status to returned (pending inspection)
    booking.status = 'returned';
    booking.returnedAt = new Date().toISOString();
    // Note: inspection will be done separately
    
    // Restore car stock
    const carName = booking.car || booking.carName;
    const currentStock = parseInt(localStorage.getItem('stock_' + carName) || '0');
    localStorage.setItem('stock_' + carName, currentStock + 1);
    
    // Save updated bookings
    localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
    
    // Refresh dashboard
    loadDashboardData();
    alert('✅ Car marked as returned! Please proceed to inspect the vehicle.');
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

// ========== REFUND PROCESSING FOR CANCELLED BOOKINGS ==========
function processRefund(bookingId) {
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const bookingIndex = bookings.findIndex(b => String(b.id) === String(bookingId));
    
    if (bookingIndex === -1) {
        alert('Booking not found!');
        return;
    }
    
    const booking = bookings[bookingIndex];
    const refundAmount = parseFloat(booking.total) || 0;
    
    // Confirm refund
    const confirmRefund = confirm(
        `💰 PROCESS REFUND\n\n` +
        `Booking ID: #${booking.id}\n` +
        `Customer: ${booking.userName || booking.userEmail}\n` +
        `Car: ${booking.car || booking.carName}\n` +
        `Payment Method: ${booking.paymentMethod || 'N/A'}\n\n` +
        `Refund Amount: $${refundAmount.toFixed(2)}\n\n` +
        `Click OK to confirm the refund has been processed.`
    );
    
    if (!confirmRefund) return;
    
    // Mark booking as refunded
    booking.refunded = true;
    booking.refundedAt = new Date().toISOString();
    booking.refundedBy = JSON.parse(localStorage.getItem('currentAdmin'))?.email || 'staff';
    booking.refundAmount = refundAmount;
    
    // Save updated bookings
    localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
    
    // Refresh dashboard
    loadDashboardData();
    
    alert(
        `✅ Refund Processed!\n\n` +
        `Customer: ${booking.userName || booking.userEmail}\n` +
        `Amount: $${refundAmount.toFixed(2)}\n\n` +
        `The booking has been marked as refunded.`
    );
}
