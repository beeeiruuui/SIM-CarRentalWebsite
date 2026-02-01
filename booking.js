// Get URL parameters
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Calculate price based on rental period type
function calculatePrice(basePrice, duration, periodType) {
    let totalDays = duration;
    let discount = 0;
    let discountText = '';

    if (periodType === 'weekly') {
        totalDays = duration * 7;
        discount = 0.10; // 10% off for weekly
        discountText = '10% weekly discount applied!';
    } else if (periodType === 'monthly') {
        totalDays = duration * 30;
        discount = 0.20; // 20% off for monthly
        discountText = '20% monthly discount applied!';
    }

    const subtotal = basePrice * totalDays;
    const discountAmount = subtotal * discount;
    const total = subtotal - discountAmount;

    return { totalDays, subtotal, discountAmount, total, discountText };
}

// Update duration hint based on period type
function updateDurationHint(periodType) {
    const hint = document.getElementById('duration-hint');
    if (periodType === 'daily') {
        hint.textContent = 'Number of days';
    } else if (periodType === 'weekly') {
        hint.textContent = 'Number of weeks';
    } else if (periodType === 'monthly') {
        hint.textContent = 'Number of months';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const carName = getUrlParameter('car');
    const cars = getCars();
    const car = cars.find(c => c.name === carName);

    if (!car) {
        document.querySelector('.car-details-container').innerHTML = '<h2>Car not found</h2>';
        return;
    }

    const fuelLabel = car.fuelType || 'Electric';

    // Update header
    document.getElementById('car-name').textContent = car.name;
    document.getElementById('car-price').textContent = `$${car.price}/day • ${fuelLabel}`;
    document.getElementById('car-model').textContent = car.name;
    document.getElementById('car-rate').textContent = `$${car.price} per day • ${fuelLabel}`;
    document.getElementById('car-availability').textContent = car.available ? 'Available' : 'Out of Stock';

    // Disable form if car not available
    const submitBtn = document.getElementById('submit-booking');
    const formInputs = document.querySelectorAll('#bookingForm input, #bookingForm select');
    if (!car.available) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Car Not Available';
        formInputs.forEach(input => input.disabled = true);
    }

    // Set minimum date to today
    const dateInput = document.getElementById('date-from');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;

    // Price calculation function
    function updatePriceEstimate() {
        const periodType = document.getElementById('rental-period').value;
        const duration = parseInt(document.getElementById('rental-duration').value) || 1;
        const priceInfo = calculatePrice(car.price, duration, periodType);
        
        document.getElementById('estimated-total').textContent = `$${priceInfo.total.toFixed(2)} (${priceInfo.totalDays} days)`;
        document.getElementById('discount-info').textContent = priceInfo.discountText;
    }

    // Listen for rental period changes
    document.getElementById('rental-period').addEventListener('change', function(e) {
        updateDurationHint(e.target.value);
        updatePriceEstimate();
    });

    document.getElementById('rental-duration').addEventListener('input', updatePriceEstimate);

    // Initialize price estimate
    updatePriceEstimate();

    // Create thumbnail gallery
    const mainImage = document.getElementById('main-image');
    const thumbnailsContainer = document.getElementById('thumbnails-container');

    if (car.angles && car.angles.length > 0) {
        car.angles.forEach((angle, index) => {
            // Create thumbnail
            const thumbnail = document.createElement('img');
            thumbnail.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumbnail.src = angle.image;
            thumbnail.alt = angle.angle;
            
            const thumbDiv = document.createElement('div');
            thumbDiv.className = `thumbnail ${index === 0 ? 'active' : ''}`;
            thumbDiv.appendChild(thumbnail);
            
            thumbDiv.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelectorAll('.thumbnail').forEach(thumb => {
                    thumb.classList.remove('active');
                });
                thumbDiv.classList.add('active');
                mainImage.src = angle.image;
            });

            thumbnailsContainer.appendChild(thumbDiv);

            if (index === 0) {
                mainImage.src = angle.image;
            }
        });
    } else {
        mainImage.src = car.image;
    }

    // Handle form submission
    document.getElementById('bookingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!car.available) {
            alert('This car is not available for rental.');
            return;
        }

        const periodType = document.getElementById('rental-period').value;
        const duration = document.getElementById('rental-duration').value;
        const color = document.getElementById('car-color').value;
        const pickupBranch = document.getElementById('pickup-branch').value;
        const returnBranch = document.getElementById('return-branch').value;
        const dateFrom = document.getElementById('date-from').value;
        const time = document.getElementById('time').value;
        const paymentMethod = document.getElementById('payment-method').value;

        // Calculate total price
        const priceInfo = calculatePrice(car.price, parseInt(duration), periodType);

        // Build payment page URL with parameters
        const paymentUrl = `payment.html?car=${encodeURIComponent(car.name)}&period=${periodType}&duration=${duration}&days=${priceInfo.totalDays}&color=${encodeURIComponent(color)}&pickup=${encodeURIComponent(pickupBranch)}&return=${encodeURIComponent(returnBranch)}&date-from=${dateFrom}&time=${time}&payment=${encodeURIComponent(paymentMethod)}&total=${priceInfo.total.toFixed(2)}&discount=${priceInfo.discountAmount.toFixed(2)}`;
        
        window.location.href = paymentUrl;
    });
});
