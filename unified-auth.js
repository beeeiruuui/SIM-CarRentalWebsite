// ========== UNIFIED AUTHENTICATION =========

let currentUserType = 'customer'; // 'customer' or 'staff'
let currentAuthMode = 'login'; // 'login' or 'signup' - determined by page

// ========== PASSWORD VALIDATION HELPERS ==========

function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
    return '';
}

function validateEmail(email, isStaff) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }
    if (isStaff && !email.endsWith('@azoom.mymail.sg')) {
        return 'Staff email must end with @azoom.mymail.sg';
    }
    return '';
}

// ========== LOGIN PAGE FUNCTIONS ==========

function switchLoginType(type) {
    currentUserType = type;
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Toggle email hint visibility
    const emailHint = document.getElementById('email-hint');
    if (emailHint) {
        if (type === 'staff') {
            emailHint.style.display = 'block';
        } else {
            emailHint.style.display = 'none';
        }
    }
}

function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;
    
    // Validate email
    let emailError = validateEmail(email, currentUserType === 'staff');
    if (emailError) {
        alert(emailError);
        return;
    }
    
    // Validate password
    if (!password) {
        alert('Please enter your password');
        return;
    }
    
    if (currentUserType === 'customer') {
        // Customer login
        const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            alert('Invalid email or password');
            return;
        }
        
        // Login successful
        localStorage.setItem('currentUser', JSON.stringify(user));
        if (rememberMe) {
            localStorage.setItem('savedEmail', email);
        }
        
        // Redirect to home or dashboard
        window.location.href = 'index.html';
        
    } else {
        // Staff login
        const staff = JSON.parse(localStorage.getItem('azoom_staff') || '[]');
        const staffMember = staff.find(s => s.email === email && s.password === password);
        
        if (!staffMember) {
            alert('Invalid staff email or password');
            return;
        }
        
        // Login successful
        localStorage.setItem('currentAdmin', JSON.stringify(staffMember));
        if (rememberMe) {
            localStorage.setItem('savedEmail', email);
        }
        
        // Redirect to admin dashboard
        window.location.href = 'admin-dashboard.html';
    }
}

// ========== SIGNUP PAGE FUNCTIONS ==========

function switchSignupType(type) {
    currentUserType = type;
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Toggle staff-specific fields visibility
    const staffFields = document.getElementById('staff-fields');
    if (staffFields) {
        if (type === 'staff') {
            staffFields.style.display = 'grid';
        } else {
            staffFields.style.display = 'none';
        }
    }
    
    // Toggle email hint visibility
    const emailHint = document.getElementById('signup-email-hint');
    if (emailHint) {
        if (type === 'staff') {
            emailHint.style.display = 'block';
        } else {
            emailHint.style.display = 'none';
        }
    }
}

function handleSignup(e) {
    e.preventDefault();
    console.log('Signup form submitted');
    
    const firstName = document.getElementById('first-name')?.value.trim();
    const lastName = document.getElementById('last-name')?.value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const agreeTerms = document.getElementById('agree-terms').checked;
    
    console.log('Form values:', { firstName, lastName, email, currentUserType, agreeTerms });
    
    // Validate basic fields
    if (!firstName || !lastName) {
        alert('Please enter your full name');
        return;
    }
    
    if (!email) {
        alert('Please enter your email');
        return;
    }
    
    // Validate email format and staff domain
    let emailError = validateEmail(email, currentUserType === 'staff');
    if (emailError) {
        alert(emailError);
        return;
    }
    
    // Validate password
    let passwordError = validatePassword(password);
    if (passwordError) {
        alert(passwordError);
        return;
    }
    
    // Confirm passwords match
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Terms agreement
    if (!agreeTerms) {
        alert('Please agree to the terms and conditions');
        return;
    }
    
    if (currentUserType === 'customer') {
        // Customer signup
        const users = JSON.parse(localStorage.getItem('azoom_users') || '[]');
        
        // Check if email already exists
        if (users.some(u => u.email === email)) {
            alert('This email is already registered');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now(),
            firstName,
            lastName,
            email,
            password,
            signupDate: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('azoom_users', JSON.stringify(users));
        
        // Auto login
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        alert('Account created successfully! Welcome to AZoom Car Rental.');
        window.location.href = 'index.html';
        
    } else {
        // Staff signup
        const staffId = document.getElementById('staff-id')?.value.trim();
        const department = document.getElementById('department')?.value;
        
        if (!staffId || !department) {
            alert('Please enter staff ID and select a department');
            return;
        }
        
        const staff = JSON.parse(localStorage.getItem('azoom_staff') || '[]');
        
        // Check if email already exists
        if (staff.some(s => s.email === email)) {
            alert('This staff email is already registered');
            return;
        }
        
        // Create new staff member
        const newStaff = {
            id: Date.now(),
            staffId,
            firstName,
            lastName,
            email,
            password,
            department,
            role: 'staff',
            signupDate: new Date().toISOString()
        };
        
        staff.push(newStaff);
        localStorage.setItem('azoom_staff', JSON.stringify(staff));
        
        // Auto login
        localStorage.setItem('currentAdmin', JSON.stringify(newStaff));
        alert('Staff account created successfully! Redirecting to admin dashboard.');
        window.location.href = 'admin-dashboard.html';
    }
}

// ========== INITIALIZATION ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');
    
    // Detect if we're on login or signup page
    const pageTitle = document.querySelector('.auth-box h2')?.textContent.toLowerCase() || '';
    console.log('Page title:', pageTitle);
    
    if (pageTitle.includes('sign up') || pageTitle.includes('create')) {
        currentAuthMode = 'signup';
        console.log('Detected signup page');
        const form = document.querySelector('.auth-box form');
        console.log('Form element:', form);
        if (form) {
            form.addEventListener('submit', handleSignup);
            console.log('Submit listener attached to signup form');
        }
        
        // Check for saved email
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            const emailInput = document.getElementById('signup-email');
            if (emailInput) emailInput.value = savedEmail;
        }
    } else {
        currentAuthMode = 'login';
        console.log('Detected login page');
        const form = document.querySelector('.auth-box form');
        console.log('Form element:', form);
        if (form) {
            form.addEventListener('submit', handleLogin);
            console.log('Submit listener attached to login form');
        }
        
        // Check for saved email
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            const emailInput = document.getElementById('login-email');
            if (emailInput) emailInput.value = savedEmail;
        }
    }
    
    // Check if already logged in - only redirect if on login page
    if (currentAuthMode === 'login') {
        const currentUser = localStorage.getItem('currentUser');
        const currentAdmin = localStorage.getItem('currentAdmin');
        
        if (currentUser) {
            console.log('User already logged in, redirecting to index');
            window.location.href = 'index.html';
        } else if (currentAdmin) {
            console.log('Admin already logged in, redirecting to dashboard');
            window.location.href = 'admin-dashboard.html';
        }
    }
});

// ========== LOGOUT FUNCTION ==========

function logout() {
    if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentAdmin');
        window.location.href = 'index.html';
    }
}
