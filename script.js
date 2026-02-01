// ========== MOBILE MENU TOGGLE ==========
function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    const search = document.getElementById('nav-search');
    const authButtons = document.getElementById('auth-buttons');
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    
    // Toggle mobile-open class
    nav?.classList.toggle('mobile-open');
    search?.classList.toggle('mobile-open');
    authButtons?.classList.toggle('mobile-open');
    
    // Change hamburger icon to X when open
    if (nav?.classList.contains('mobile-open')) {
        toggleBtn.textContent = '✕';
    } else {
        toggleBtn.textContent = '☰';
    }
}

// Close mobile menu when clicking a nav link
document.addEventListener('click', function(e) {
    if (e.target.matches('.nav a')) {
        const nav = document.getElementById('main-nav');
        const search = document.getElementById('nav-search');
        const authButtons = document.getElementById('auth-buttons');
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        
        if (window.innerWidth <= 768) {
            nav?.classList.remove('mobile-open');
            search?.classList.remove('mobile-open');
            authButtons?.classList.remove('mobile-open');
            if (toggleBtn) toggleBtn.textContent = '☰';
        }
    }
});

// Store active filter states
let activeFilters = {
    maxPrice: 500,
    availability: 'available',
    sortBy: ''
};

// Apply all filters and sort
function applyAllFilters() {
    let cars = getCars();

    // Filter by availability
    if (activeFilters.availability === 'available') {
        cars = cars.filter(car => car.available);
    } else if (activeFilters.availability === 'unavailable') {
        cars = cars.filter(car => !car.available);
    }

    // Filter by price range
    cars = cars.filter(car => car.price <= activeFilters.maxPrice);

    // Apply sort
    if (activeFilters.sortBy === 'name-asc') {
        cars.sort((a, b) => a.name.localeCompare(b.name));
    } else if (activeFilters.sortBy === 'name-desc') {
        cars.sort((a, b) => b.name.localeCompare(a.name));
    } else if (activeFilters.sortBy === 'price-asc') {
        cars.sort((a, b) => a.price - b.price);
    } else if (activeFilters.sortBy === 'price-desc') {
        cars.sort((a, b) => b.price - a.price);
    }

    displayCars(cars);
}

// Display cars on the rentals page
function displayCars(cars = getCars(), searchQuery = '') {
    const carsContainer = document.getElementById('cars-container');
    if (!carsContainer) return; // Exit if not on rentals page
    
    carsContainer.innerHTML = '';

    // Show "no results" message if no cars found
    if (cars.length === 0) {
        carsContainer.innerHTML = `
            <div class="no-results" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                <div style="font-size: 3em; margin-bottom: 15px;">🔍</div>
                <h3 style="color: #333; margin-bottom: 10px;">No cars found${searchQuery ? ` for "${searchQuery}"` : ''}</h3>
                <p style="color: #666; margin-bottom: 20px;">Try a different search term or browse our full fleet.</p>
                <button onclick="window.location.href='rentals.html'" style="padding: 12px 25px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">View All Cars</button>
            </div>
        `;
        return;
    }

    cars.forEach(car => {
        const carCard = document.createElement('div');
        carCard.className = 'car-card';
        const fuelLabel = car.fuelType || 'Electric';
        const isElectric = fuelLabel === 'Electric';
        carCard.innerHTML = `
            <div class="car-image">
                <img src="${car.image}" alt="${car.name}">
                <div class="car-status ${car.available ? 'available' : 'unavailable'}">
                    ${car.available ? 'Available' : 'Out of Stock'}
                </div>
            </div>
            <div class="car-details">
                <div class="car-name">${car.name}</div>
                <div class="car-price">$${car.price}/day <span class="car-fuel ${isElectric ? 'electric' : ''}">${fuelLabel}</span></div>
                <div class="car-info">
                    <p>In Stock: <strong>${car.stock}</strong></p>
                </div>
                <button class="btn-rent" onclick="rentCar('${car.name}')" ${!car.available ? 'disabled' : ''}>
                    ${car.available ? 'Rent Now' : 'Not Available'}
                </button>
            </div>
        `;
        carsContainer.appendChild(carCard);
    });
}

// Sort cars by name or price
function sortCars(sortBy) {
    activeFilters.sortBy = sortBy;
    applyAllFilters();
}

// Filter cars by price range (max price)
function filterByPriceRange(maxPrice) {
    activeFilters.maxPrice = maxPrice;
    applyAllFilters();
}

// Filter cars by availability
function filterByAvailability(status) {
    activeFilters.availability = status;
    applyAllFilters();
}

// Search cars
function searchCars(query) {
    const cars = getCars();
    let filtered;
    
    if (!query || query.trim() === '') {
        // If no query, show available cars
        filtered = cars.filter(car => car.available);
    } else {
        // Filter by name matching the query
        filtered = cars.filter(car => 
            car.name.toLowerCase().includes(query.toLowerCase())
        );
    }
    
    displayCars(filtered, query);
}

// Get URL parameter helper
function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Handler used by navbar form submit - redirects to rentals page with search query
function handleSearch(query) {
    if (!query || query.trim() === '') {
        // If empty search, just go to rentals page
        window.location.href = 'rentals.html';
        return;
    }
    // Redirect to rentals page with search query parameter
    window.location.href = `rentals.html?search=${encodeURIComponent(query.trim())}`;
}

// Redirect to booking page (requires login)
function rentCar(carName) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.email) {
        alert('Please sign in to book a car.');
        // Store the intended car so we can redirect after login
        sessionStorage.setItem('pendingBookingCar', carName);
        window.location.href = 'login.html';
        return;
    }
    window.location.href = `booking.html?car=${encodeURIComponent(carName)}`;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Display only available cars initially (only on rentals page)
    const carsContainer = document.getElementById('cars-container');
    if (carsContainer) {
        const cars = getCars();
        const availableCars = cars.filter(car => car.available);
        
        // Check if there's a search query in URL
        const searchQuery = getUrlParam('search');
        if (searchQuery) {
            // Pre-fill the search input
            const searchInput = document.getElementById('nav-search-input');
            if (searchInput) {
                searchInput.value = searchQuery;
            }
            // Apply search filter
            searchCars(searchQuery);
        } else {
            displayCars(availableCars);
        }
    }

    // Search functionality (support navbar or hero search input)
    const searchInput = document.getElementById('nav-search-input') || document.getElementById('search-input');
    if (searchInput) {
        // Only apply live search on rentals page (where cars-container exists)
        if (document.getElementById('cars-container')) {
            searchInput.addEventListener('input', function(e) {
                searchCars(e.target.value);
            });
        }
    }

    const searchBtn = document.querySelector('.nav-search .btn-search') || document.querySelector('.hero .btn-search');
    if (searchBtn) {
        // Remove the old click handler as the form's onsubmit handles it
        // But add a fallback for direct click
        searchBtn.addEventListener('click', function(e) {
            const currentInput = document.getElementById('nav-search-input') || document.getElementById('search-input');
            const query = currentInput ? currentInput.value : '';
            
            // If on rentals page, search directly. Otherwise redirect.
            if (document.getElementById('cars-container')) {
                searchCars(query);
            } else {
                handleSearch(query);
            }
        });
    }

    // Price filter with range slider
    const priceSlider = document.getElementById('price-slider');
    const priceValueMax = document.getElementById('price-value-max');
    if (priceSlider) {
        priceSlider.addEventListener('input', function(e) {
            const maxPrice = parseInt(e.target.value);
            priceValueMax.textContent = maxPrice;
            filterByPriceRange(maxPrice);
        });
    }

    // Availability filter
    const availabilityFilter = document.getElementById('availability-filter');
    if (availabilityFilter) {
        // Set default value to "available"
        availabilityFilter.value = 'available';
        
        availabilityFilter.addEventListener('change', function(e) {
            if (e.target.value) {
                filterByAvailability(e.target.value);
            }
        });
    }

    // Sort filter
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) {
        sortFilter.addEventListener('change', function(e) {
            if (e.target.value) {
                sortCars(e.target.value);
            }
        });
    }

    // Header remains fixed and visible; auto-hide removed so search stays accessible while scrolling.

    // Check authentication status and update navbar
    updateAuthButtons();
    
    // Update navbar active state on load and when hash changes
    highlightActiveNavLink();
    window.addEventListener('hashchange', highlightActiveNavLink);
    
    // Initialize scroll-spy to highlight nav based on visible sections
    initScrollSpy();
});

// ========== AUTHENTICATION STATUS ==========

function updateAuthButtons() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || 'null');
    const authButtonsContainer = document.querySelector('.auth-buttons');
    
    if (!authButtonsContainer) return;
    
    if (currentUser) {
        // Customer is logged in
        const initial = currentUser.firstName ? currentUser.firstName.charAt(0).toUpperCase() : 'U';
        authButtonsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <div onclick="window.location.href='profile.html'" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #3498db, #2ecc71); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s; font-size: 1.1em;" title="${currentUser.firstName} ${currentUser.lastName}">
                    ${initial}
                </div>
                <button class="btn-signin" onclick="logout()" style="background: #e74c3c;">Sign Out</button>
            </div>
        `;
    } else if (currentAdmin) {
        // Staff is logged in
        const initial = currentAdmin.firstName ? currentAdmin.firstName.charAt(0).toUpperCase() : 'A';
        authButtonsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div onclick="window.location.href='profile.html'" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #e74c3c, #d63a25); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s; font-size: 1.1em;" title="${currentAdmin.firstName} ${currentAdmin.lastName} (Staff)">
                    ${initial}
                </div>
                <button class="btn-signin" onclick="window.location.href='admin-dashboard.html'" style="background: #3498db; padding: 8px 16px;">Dashboard</button>
                <button class="btn-signup" onclick="logout()" style="background: #e74c3c; padding: 8px 16px;">Sign Out</button>
            </div>
        `;
    } else {
        // Not logged in
        authButtonsContainer.innerHTML = `
            <button class="btn-signin" onclick="window.location.href='login.html'">Sign In</button>
            <button class="btn-signup" onclick="window.location.href='signup.html'">Sign Up</button>
        `;
    }
}

function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentAdmin');
        alert('You have been signed out successfully.');
        window.location.href = 'index.html';
    }
}

// Simple function to highlight the active nav link based on URL hash
function highlightActiveNavLink() {
    const currentHash = window.location.hash || '';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav a');
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        
        const linkHref = link.getAttribute('href');
        
        // Handle hash-based links (#services, #about, #contact)
        if (linkHref.startsWith('#')) {
            if (linkHref === currentHash) {
                link.classList.add('active');
            }
        }
        // Handle page-based links (index.html, rentals.html)
        else {
            const linkPage = linkHref.split('/').pop() || 'index.html';
            if (linkPage === currentPage && !currentHash) {
                link.classList.add('active');
            }
        }
    });
}

// Initialize a scroll-spy using IntersectionObserver to detect visible sections
function initScrollSpy() {
    // Only run scroll-spy on index.html (home page)
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== 'index.html' && currentPage !== '') return;

    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                // Highlight the nav link for this section
                const navLinks = document.querySelectorAll('.nav a');
                navLinks.forEach(link => {
                    // Only manage active state for hash links (same-page anchors)
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        link.classList.remove('active');
                        if (href === '#' + sectionId) {
                            link.classList.add('active');
                        }
                    }
                });
            }
        });
    }, { root: null, rootMargin: '0px 0px -60% 0px', threshold: 0 });

    sections.forEach(sec => observer.observe(sec));
}
