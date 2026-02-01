// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Load booking details on page load
document.addEventListener('DOMContentLoaded', function() {
    const car = getUrlParameter('car');
    const days = getUrlParameter('days');
    const color = getUrlParameter('color');
    const dateFrom = getUrlParameter('date-from');
    const time = getUrlParameter('time');
    const paymentMethod = getUrlParameter('payment');
    const pickupBranch = getUrlParameter('pickup');
    const returnBranch = getUrlParameter('return');
    const total = getUrlParameter('total');
    const discount = getUrlParameter('discount');

    // Get car data for additional info
    const carData = getCarByName(car);
    const fuelType = carData ? (carData.fuelType || 'Electric') : 'Electric';
    const dailyRate = carData ? carData.price : 0;
    const finalTotal = total || (dailyRate * parseInt(days || 1));

    // Get current user info
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const customerName = currentUser.firstName && currentUser.lastName 
        ? `${currentUser.firstName} ${currentUser.lastName}` 
        : 'Guest Customer';

    // Generate booking confirmation number
    const bookingNumber = 'BK-' + Date.now();

    // Populate all fields
    document.getElementById('booking-number').textContent = bookingNumber;
    document.getElementById('customer-name').textContent = customerName;
    document.getElementById('vehicle-name').textContent = car;
    document.getElementById('fuel-type').textContent = fuelType;
    document.getElementById('vehicle-color').textContent = color;
    document.getElementById('pickup-branch').textContent = pickupBranch ? pickupBranch.split(' - ')[0] : '';
    document.getElementById('return-branch').textContent = returnBranch ? returnBranch.split(' - ')[0] : '';
    document.getElementById('pickup-date').textContent = dateFrom;
    document.getElementById('pickup-time').textContent = time;
    document.getElementById('rental-days').textContent = days;
    document.getElementById('daily-rate').textContent = dailyRate;
    document.getElementById('total-amount').textContent = finalTotal;
    document.getElementById('payment-method').textContent = paymentMethod;
    document.getElementById('booking-date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    // Create booking record
    const booking = {
        id: bookingNumber,
        customerId: currentUser.id,
        customerName: customerName,
        userName: customerName,
        userEmail: currentUser.email,
        car: car,
        carName: car,
        fuelType: fuelType,
        color: color,
        pickupBranch: pickupBranch,
        returnBranch: returnBranch,
        pickupDate: dateFrom,
        pickupTime: time,
        totalDays: parseInt(days || 1),
        dailyRate: parseFloat(dailyRate) || 50,
        discount: parseFloat(discount || 0),
        total: parseFloat(finalTotal),
        paymentMethod: paymentMethod,
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
    };

    // Save booking to customer's bookings (in currentUser if logged in)
    if (currentUser.id) {
        let customerBookings = JSON.parse(localStorage.getItem('customerBookings_' + currentUser.id) || '[]');
        customerBookings.push(booking);
        localStorage.setItem('customerBookings_' + currentUser.id, JSON.stringify(customerBookings));
    }

    // Save booking to admin system (all bookings)
    let allBookings = JSON.parse(localStorage.getItem('azoom_bookings') || '[]');
    allBookings.push(booking);
    localStorage.setItem('azoom_bookings', JSON.stringify(allBookings));

    // Update car stock - use current stock from localStorage, not original
    if (carData) {
        const stockKey = 'stock_' + car;
        const storedStock = localStorage.getItem(stockKey);
        // Use stored stock if exists, otherwise use original stock from data.js
        const currentStock = storedStock !== null ? parseInt(storedStock) : carData.stock;
        if (currentStock > 0) {
            localStorage.setItem(stockKey, currentStock - 1);
            console.log(`Stock updated for ${car}: ${currentStock} -> ${currentStock - 1}`);
        }
    }

    console.log('Booking saved:', booking);
});
