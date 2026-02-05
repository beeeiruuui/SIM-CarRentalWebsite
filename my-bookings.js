// Get bookings from localStorage
function getBookings() {
    return JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
}

// Save booking
function saveBooking(booking) {
    const bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
}

// Update car stock in localStorage
function updateCarStock(carName, change) {
    const stockKey = 'stock_' + carName;
    const currentStock = parseInt(localStorage.getItem(stockKey) || '5');
    const newStock = Math.max(0, currentStock + change);
    localStorage.setItem(stockKey, newStock.toString());
    console.log(`Stock updated for ${carName}: ${currentStock} -> ${newStock}`);
}

// Update booking status
function updateBookingStatus(bookingId, status) {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === bookingId);
    if (index !== -1) {
        const booking = bookings[index];
        const previousStatus = booking.status;
        booking.status = status;
        
        if (status === 'returned') {
            booking.returnDate = new Date().toISOString().split('T')[0];
            booking.returnTime = new Date().toLocaleTimeString();
            booking.returnedAt = new Date().toISOString(); // For admin dashboard compatibility
            // Increase stock when car is returned
            updateCarStock(booking.car || booking.carName, 1);
        }
        
        if (status === 'cancelled' && previousStatus === 'confirmed') {
            booking.cancelDate = new Date().toISOString().split('T')[0];
            // Increase stock when booking is cancelled (car was never picked up)
            updateCarStock(booking.car || booking.carName, 1);
        }
        
        localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
        displayBookings();
    }
}

// Return car function
function returnCar(bookingId) {
    if (confirm('Are you sure you want to mark this car as returned?')) {
        updateBookingStatus(bookingId, 'returned');
        alert('Car has been marked as returned. Thank you for choosing AZoom!');
    }
}

// Cancel booking function
function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        updateBookingStatus(bookingId, 'cancelled');
        alert('Booking has been cancelled.');
    }
}

// Display bookings
function displayBookings(filter = 'current') {
    const bookings = getBookings();
    const container = document.getElementById('bookings-list');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    console.log('=== DEBUG: My Bookings ===');
    console.log('All bookings in system:', bookings);
    console.log('Current user object:', currentUser);
    console.log('Current user email:', currentUser.email);
    
    // Log each booking's userEmail for comparison
    bookings.forEach((b, i) => {
        console.log(`Booking ${i}: userEmail="${b.userEmail}" vs currentUser="${currentUser.email}" | match=${b.userEmail === currentUser.email}`);
    });

    // Filter bookings for current user (case-insensitive comparison)
    const userEmail = (currentUser.email || '').toLowerCase();
    let userBookings = bookings.filter(b => (b.userEmail || '').toLowerCase() === userEmail);
    console.log('Filtered user bookings:', userBookings);

    // Apply tab filter
    const today = new Date().toISOString().split('T')[0];
    if (filter === 'current') {
        // Show confirmed bookings (active rentals)
        userBookings = userBookings.filter(b => b.status === 'confirmed');
    } else if (filter === 'past') {
        userBookings = userBookings.filter(b => 
            b.status === 'returned' || b.status === 'cancelled'
        );
    }
    // filter === 'all' shows everything

    if (!currentUser.email) {
        container.innerHTML = `
            <div class="no-bookings">
                <h3>Please sign in to view your bookings</h3>
                <p>You need to be logged in to see your rental history.</p>
                <a href="login.html" class="btn-action btn-return" style="display: inline-block; margin-top: 15px; text-decoration: none;">Sign In</a>
            </div>
        `;
        return;
    }

    if (userBookings.length === 0) {
        container.innerHTML = `
            <div class="no-bookings">
                <h3>No ${filter === 'all' ? '' : filter} bookings found</h3>
                <p>Ready to rent an electric car? Browse our fleet!</p>
                <a href="rentals.html" class="btn-action btn-return" style="display: inline-block; margin-top: 15px; text-decoration: none;">Browse Cars</a>
            </div>
        `;
        return;
    }

    container.innerHTML = userBookings.map(booking => {
        const statusClass = booking.status === 'confirmed' ? 'status-confirmed' : 
                           booking.status === 'returned' ? 'status-completed' : 'status-cancelled';
        const cardClass = booking.status === 'returned' ? 'past' : 
                         booking.status === 'cancelled' ? 'cancelled' : '';

        return `
            <div class="booking-card ${cardClass}">
                <div class="booking-header">
                    <div>
                        <strong>${booking.carName}</strong>
                        <span class="electric-badge">⚡ Electric</span>
                        <div class="booking-id">Booking #${booking.id}</div>
                    </div>
                    <span class="booking-status ${statusClass}">${booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                </div>
                <div class="booking-details">
                    <div class="booking-detail">
                        <span class="detail-label">Pickup Date</span>
                        <span class="detail-value">${booking.pickupDate}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">Pickup Time</span>
                        <span class="detail-value">${booking.pickupTime}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">Duration</span>
                        <span class="detail-value">${booking.totalDays} day(s)</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">Pickup Branch</span>
                        <span class="detail-value">${booking.pickupBranch ? booking.pickupBranch.split(' - ')[0] : 'N/A'}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">Return Branch</span>
                        <span class="detail-value">${booking.returnBranch ? booking.returnBranch.split(' - ')[0] : 'N/A'}</span>
                    </div>
                    <div class="booking-detail">
                        <span class="detail-label">Total</span>
                        <span class="detail-value">$${booking.total}</span>
                    </div>
                </div>
                ${booking.status === 'confirmed' ? `
                    <div class="booking-actions">
                        <button class="btn-action btn-modify" onclick="openModifyModal('${booking.id}')">✏️ Modify</button>
                        <button class="btn-action btn-extend" onclick="openExtendModal('${booking.id}')">⏰ Extend</button>
                        <button class="btn-action btn-return" onclick="returnCar('${booking.id}')">✅ Return</button>
                        <button class="btn-action btn-cancel" onclick="cancelBooking('${booking.id}')">❌ Cancel</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Tab switching
function showBookings(filter) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    displayBookings(filter);
}

// ========== MODIFY BOOKING FUNCTIONS ==========
function openModifyModal(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    document.getElementById('modifyBookingId').value = bookingId;
    document.getElementById('modifyPickupDate').value = booking.pickupDate;
    document.getElementById('modifyPickupTime').value = booking.pickupTime || '10:00';
    document.getElementById('modifyPickupBranch').value = booking.pickupBranch;
    document.getElementById('modifyReturnBranch').value = booking.returnBranch;
    
    // Set minimum date to today
    document.getElementById('modifyPickupDate').min = new Date().toISOString().split('T')[0];
    
    document.getElementById('modifyModal').classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ========== EXTEND RENTAL FUNCTIONS ==========
let currentExtendBooking = null;

function openExtendModal(bookingId) {
    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    currentExtendBooking = booking;
    
    document.getElementById('extendBookingId').value = bookingId;
    document.getElementById('extendDailyRate').value = booking.dailyRate || 50;
    document.getElementById('extendDays').value = 1;
    
    // Show current booking info
    document.getElementById('currentBookingInfo').innerHTML = `
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <strong>${booking.carName || booking.car}</strong><br>
            <small>Current: ${booking.totalDays} day(s) | Ends: ${calculateEndDate(booking.pickupDate, booking.totalDays)}</small>
        </div>
    `;
    
    updateExtendPreview();
    document.getElementById('extendModal').classList.add('active');
}

function calculateEndDate(startDate, days) {
    const start = new Date(startDate);
    start.setDate(start.getDate() + parseInt(days));
    return start.toLocaleDateString();
}

function updateExtendPreview() {
    if (!currentExtendBooking) return;
    
    const extraDays = parseInt(document.getElementById('extendDays').value) || 1;
    const dailyRate = parseFloat(currentExtendBooking.dailyRate) || 50;
    const currentDays = parseInt(currentExtendBooking.totalDays) || 1;
    const currentTotal = parseFloat(currentExtendBooking.total) || 0;
    
    const additionalCost = extraDays * dailyRate;
    const newTotal = currentTotal + additionalCost;
    
    document.getElementById('currentDuration').textContent = `${currentDays} day(s)`;
    document.getElementById('extraDays').textContent = `${extraDays} day(s)`;
    document.getElementById('dailyRateDisplay').textContent = `$${dailyRate.toFixed(2)}/day`;
    document.getElementById('additionalCost').textContent = `$${additionalCost.toFixed(2)}`;
    document.getElementById('newTotalDisplay').textContent = `$${newTotal.toFixed(2)}`;
}

// ========== EXPORT TO PDF FUNCTION ==========
function exportBookingsPDF() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.email) {
        alert('Please sign in to export your bookings.');
        return;
    }
    
    const bookings = getBookings().filter(b => b.userEmail === currentUser.email);
    
    if (bookings.length === 0) {
        alert('No bookings to export.');
        return;
    }
    
    // Create printable HTML
    const printWindow = window.open('', '_blank');
    const totalSpent = bookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AZoom Car Rental - Booking History</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 40px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 3px solid #e74c3c;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #1a1a2e;
                    margin: 0;
                }
                .header p {
                    color: #666;
                    margin: 5px 0;
                }
                .customer-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }
                .summary {
                    display: flex;
                    justify-content: space-around;
                    background: #1a1a2e;
                    color: white;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                }
                .summary-item {
                    text-align: center;
                }
                .summary-item h3 {
                    margin: 0;
                    font-size: 2em;
                    color: #e74c3c;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 12px;
                    text-align: left;
                }
                th {
                    background: #1a1a2e;
                    color: white;
                }
                tr:nth-child(even) {
                    background: #f8f9fa;
                }
                .status-confirmed { color: #27ae60; font-weight: bold; }
                .status-returned { color: #3498db; font-weight: bold; }
                .status-cancelled { color: #e74c3c; font-weight: bold; }
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    color: #666;
                    font-size: 0.9em;
                }
                @media print {
                    body { padding: 20px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>⚡ AZoom Car Rental</h1>
                <p>100% Electric Fleet | Booking History Report</p>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="customer-info">
                <strong>Customer:</strong> ${currentUser.firstName || ''} ${currentUser.lastName || ''}<br>
                <strong>Email:</strong> ${currentUser.email}
            </div>
            
            <div class="summary">
                <div class="summary-item">
                    <h3>${bookings.length}</h3>
                    <p>Total Bookings</p>
                </div>
                <div class="summary-item">
                    <h3>${bookings.filter(b => b.status === 'confirmed').length}</h3>
                    <p>Active Rentals</p>
                </div>
                <div class="summary-item">
                    <h3>$${totalSpent.toFixed(2)}</h3>
                    <p>Total Spent</p>
                </div>
            </div>
            
            <h2>📋 Booking Details</h2>
            <table>
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>Car</th>
                        <th>Pickup Date</th>
                        <th>Duration</th>
                        <th>Branch</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${bookings.map(b => `
                        <tr>
                            <td>#${b.id}</td>
                            <td>${b.carName || b.car}</td>
                            <td>${b.pickupDate}</td>
                            <td>${b.totalDays} day(s)</td>
                            <td>${b.pickupBranch ? b.pickupBranch.split(' - ')[0] : 'N/A'}</td>
                            <td>$${parseFloat(b.total || 0).toFixed(2)}</td>
                            <td class="status-${b.status}">${b.status.toUpperCase()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <p>Thank you for choosing AZoom Car Rental!</p>
                <p>🌱 100% Electric Fleet - Driving Towards a Greener Future</p>
                <p>🚗 Storhub, 615 Lorong 4 Toa Payoh | 🚗 Keppel Bay, 2 Keppel Bay Vista</p>
                <p>📞 +65 8682 8785 | ✉️ info@azoomcarrental.sg</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 30px;">
                <button onclick="window.print()" style="padding: 15px 30px; background: #e74c3c; color: white; border: none; border-radius: 8px; font-size: 1.1em; cursor: pointer;">
                    🖨️ Print / Save as PDF
                </button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    displayBookings('current');
    
    // Add event listener for email confirmation input
    const confirmEmailInput = document.getElementById('confirmEmail');
    if (confirmEmailInput) {
        confirmEmailInput.addEventListener('input', checkDeleteConfirmation);
    }
    
    // Handle modify form submission
    const modifyForm = document.getElementById('modifyForm');
    if (modifyForm) {
        modifyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const bookingId = document.getElementById('modifyBookingId').value;
            const newPickupDate = document.getElementById('modifyPickupDate').value;
            const newPickupTime = document.getElementById('modifyPickupTime').value;
            const newPickupBranch = document.getElementById('modifyPickupBranch').value;
            const newReturnBranch = document.getElementById('modifyReturnBranch').value;
            
            const bookings = getBookings();
            const index = bookings.findIndex(b => b.id === bookingId);
            
            if (index !== -1) {
                bookings[index].pickupDate = newPickupDate;
                bookings[index].pickupTime = newPickupTime;
                bookings[index].pickupBranch = newPickupBranch;
                bookings[index].returnBranch = newReturnBranch;
                bookings[index].lastModified = new Date().toISOString();
                
                localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
                closeModal('modifyModal');
                displayBookings();
                alert('Booking has been updated successfully!');
            }
        });
    }
    
    // Handle extend form submission
    const extendForm = document.getElementById('extendForm');
    if (extendForm) {
        extendForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const bookingId = document.getElementById('extendBookingId').value;
            const extraDays = parseInt(document.getElementById('extendDays').value);
            
            const bookings = getBookings();
            const index = bookings.findIndex(b => b.id === bookingId);
            
            if (index !== -1) {
                const booking = bookings[index];
                const dailyRate = parseFloat(booking.dailyRate) || 50;
                const additionalCost = extraDays * dailyRate;
                
                booking.totalDays = parseInt(booking.totalDays) + extraDays;
                booking.total = parseFloat(booking.total) + additionalCost;
                booking.extended = true;
                booking.extensionDate = new Date().toISOString();
                booking.extensionDays = extraDays;
                
                localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
                closeModal('extendModal');
                displayBookings();
                alert(`Rental extended by ${extraDays} day(s)! Additional charge: $${additionalCost.toFixed(2)}`);
            }
        });
    }
});

// ========== ACCOUNT SETTINGS FUNCTIONS ==========
function openAccountSettings() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.email) {
        alert('Please sign in to access account settings.');
        window.location.href = 'login.html';
        return;
    }
    
    // Get user's booking stats
    const bookings = getBookings().filter(b => b.userEmail === currentUser.email);
    const activeBookings = bookings.filter(b => b.status === 'confirmed').length;
    const totalSpent = bookings.reduce((sum, b) => sum + (parseFloat(b.total) || 0), 0);
    const memberSince = currentUser.signupDate 
        ? new Date(currentUser.signupDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'N/A';
    
    // Populate account info
    document.getElementById('accountInfoDisplay').innerHTML = `
        <p><strong>Name:</strong> <span>${currentUser.firstName || ''} ${currentUser.lastName || ''}</span></p>
        <p><strong>Email:</strong> <span>${currentUser.email}</span></p>
        <p><strong>Member Since:</strong> <span>${memberSince}</span></p>
        <p><strong>Total Bookings:</strong> <span>${bookings.length}</span></p>
        <p><strong>Active Rentals:</strong> <span>${activeBookings}</span></p>
        <p><strong>Total Spent:</strong> <span>$${totalSpent.toFixed(2)}</span></p>
    `;
    
    document.getElementById('accountSettingsModal').style.display = 'flex';
}

function showDeleteAccountWarning() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Check if user has active bookings
    const bookings = getBookings().filter(b => b.userEmail === currentUser.email);
    const activeBookings = bookings.filter(b => b.status === 'confirmed');
    
    if (activeBookings.length > 0) {
        alert(`You have ${activeBookings.length} active booking(s). Please return or cancel all active rentals before deleting your account.`);
        return;
    }
    
    // Close account settings modal
    closeModal('accountSettingsModal');
    
    // Show delete confirmation modal
    document.getElementById('emailToMatch').textContent = `Enter: ${currentUser.email}`;
    document.getElementById('confirmEmail').value = '';
    document.getElementById('confirmDeleteBtn').disabled = true;
    document.getElementById('deleteAccountModal').style.display = 'flex';
}

function checkDeleteConfirmation() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const enteredEmail = document.getElementById('confirmEmail').value.trim().toLowerCase();
    const userEmail = (currentUser.email || '').toLowerCase();
    
    const deleteBtn = document.getElementById('confirmDeleteBtn');
    deleteBtn.disabled = enteredEmail !== userEmail;
}

function confirmDeleteAccount() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const enteredEmail = document.getElementById('confirmEmail').value.trim().toLowerCase();
    
    if (enteredEmail !== currentUser.email.toLowerCase()) {
        alert('Email does not match. Please enter your email correctly.');
        return;
    }
    
    // Get users and remove current user
    const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
    const userIndex = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());
    
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
        localStorage.setItem('azoom_users', JSON.stringify(users));
    }
    
    // Clear current user session
    localStorage.removeItem('currentUser');
    
    // Close modal
    closeModal('deleteAccountModal');
    
    // Show success message and redirect
    alert('Your account has been successfully deleted. We\'re sorry to see you go!\n\nThank you for using AZoom Car Rental.');
    window.location.href = 'index.html';
}

// ========== DAMAGE PAYMENT FUNCTIONS ==========
function loadDamagePaymentRequests() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.email) return;

    const damageRequests = JSON.parse(localStorage.getItem('azoom_damage_requests') || '[]');
    const userRequests = damageRequests.filter(r => 
        r.userEmail.toLowerCase() === currentUser.email.toLowerCase() && 
        r.status === 'pending'
    );

    const section = document.getElementById('damagePaymentSection');
    const listContainer = document.getElementById('damageRequestsList');

    if (userRequests.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    listContainer.innerHTML = userRequests.map(request => `
        <div class="damage-request-card">
            <div class="damage-request-header">
                <span class="damage-request-id">Damage Bill #${request.id}</span>
                <span class="damage-amount">$${parseFloat(request.damageCharge).toFixed(2)}</span>
            </div>
            <div class="damage-info">
                <p><strong>Related Booking:</strong> #${request.bookingId}</p>
                <p><strong>Vehicle:</strong> ${request.car}</p>
                <p><strong>Date Issued:</strong> ${new Date(request.createdAt).toLocaleDateString()}</p>
            </div>
            <div class="damage-description">
                <p><strong>Damage Details:</strong> ${request.damageDescription}</p>
            </div>
            <button class="btn-pay-damage" onclick="openDamagePaymentModal('${request.id}')">
                💳 Pay $${parseFloat(request.damageCharge).toFixed(2)} Now
            </button>
        </div>
    `).join('');
}

let currentDamageRequest = null;

function openDamagePaymentModal(requestId) {
    const damageRequests = JSON.parse(localStorage.getItem('azoom_damage_requests') || '[]');
    currentDamageRequest = damageRequests.find(r => r.id === requestId);

    if (!currentDamageRequest) {
        alert('Payment request not found.');
        return;
    }

    document.getElementById('damagePaymentDetails').innerHTML = `
        <p><strong>Damage Bill:</strong> #${currentDamageRequest.id}</p>
        <p><strong>Vehicle:</strong> ${currentDamageRequest.car}</p>
        <p><strong>Damage:</strong> ${currentDamageRequest.damageDescription}</p>
        <p class="damage-total"><strong>Amount Due:</strong> $${parseFloat(currentDamageRequest.damageCharge).toFixed(2)}</p>
    `;

    // Reset form
    document.getElementById('damagePaymentForm').reset();
    
    document.getElementById('damagePaymentModal').classList.add('active');
}

function closeDamagePaymentModal() {
    document.getElementById('damagePaymentModal').classList.remove('active');
    currentDamageRequest = null;
}

function processDamagePayment(e) {
    e.preventDefault();

    if (!currentDamageRequest) return;

    const cardNumber = document.getElementById('damageCardNumber').value.replace(/\s/g, '');
    const expiry = document.getElementById('damageCardExpiry').value;
    const cvv = document.getElementById('damageCardCvv').value;

    // Basic validation
    if (cardNumber.length < 13 || cardNumber.length > 19) {
        alert('Please enter a valid card number.');
        return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
        alert('Please enter expiry in MM/YY format.');
        return;
    }
    if (cvv.length !== 3) {
        alert('Please enter a valid 3-digit CVV.');
        return;
    }

    // Update damage request status
    const damageRequests = JSON.parse(localStorage.getItem('azoom_damage_requests') || '[]');
    const requestIndex = damageRequests.findIndex(r => r.id === currentDamageRequest.id);
    if (requestIndex !== -1) {
        damageRequests[requestIndex].status = 'paid';
        damageRequests[requestIndex].paidAt = new Date().toISOString();
        localStorage.setItem('azoom_damage_requests', JSON.stringify(damageRequests));
    }

    // Update booking inspection status
    const bookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    const bookingIndex = bookings.findIndex(b => b.id === currentDamageRequest.bookingId);
    if (bookingIndex !== -1 && bookings[bookingIndex].inspection) {
        bookings[bookingIndex].inspection.damagePaid = true;
        bookings[bookingIndex].inspection.paidAt = new Date().toISOString();
        localStorage.setItem('azoom_bookings', JSON.stringify(bookings));
    }

    closeDamagePaymentModal();
    loadDamagePaymentRequests();
    
    alert(`✅ Payment Successful!\n\nAmount Paid: $${parseFloat(currentDamageRequest.damageCharge).toFixed(2)}\n\nThank you for settling your damage bill.`);
}

// Format card number as user types
document.addEventListener('DOMContentLoaded', function() {
    const cardInput = document.getElementById('damageCardNumber');
    if (cardInput) {
        cardInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
            let formatted = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formatted.substring(0, 19);
        });
    }

    const expiryInput = document.getElementById('damageCardExpiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }

    // Load damage requests on page load
    loadDamagePaymentRequests();
});
