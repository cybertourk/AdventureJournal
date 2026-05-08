import { loginUser, registerUser, resetPassword } from './firebase-manager.js';

export function initAuthUI() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotForm = document.getElementById('forgot-form');
    
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showForgotBtn = document.getElementById('show-forgot-btn');
    const showLoginFromForgotBtn = document.getElementById('show-login-from-forgot-btn');

    // --- Toggle Forms ---
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            if (forgotForm) forgotForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            registerForm.classList.add('hidden');
            if (forgotForm) forgotForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    if (showForgotBtn) {
        showForgotBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.add('hidden');
            if (forgotForm) forgotForm.classList.remove('hidden');
        });
    }

    if (showLoginFromForgotBtn) {
        showLoginFromForgotBtn.addEventListener('click', () => {
            if (forgotForm) forgotForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    // --- Handle Login Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page reload
            
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Basic UI feedback
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Accessing...`;
            submitBtn.disabled = true;

            try {
                await loginUser(emailInput.value, passwordInput.value);
                // On success, clearing inputs isn't strictly necessary as the screen hides, 
                // but it's good practice.
                passwordInput.value = '';
            } catch (error) {
                // If login fails, let the user try again
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Handle Registration Submission ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page reload
            
            const displayNameInput = document.getElementById('register-display-name');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            
            // Grab the optional birthday inputs
            const birthMonthInput = document.getElementById('register-birth-month');
            const birthDayInput = document.getElementById('register-birth-day');
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            // Basic UI feedback
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Forging...`;
            submitBtn.disabled = true;

            try {
                const bMonth = birthMonthInput ? birthMonthInput.value : null;
                const bDay = birthDayInput ? birthDayInput.value : null;

                // Pass the displayName and birthday data to the firebase manager
                await registerUser(emailInput.value, passwordInput.value, displayNameInput.value, bMonth, bDay, 'user');
                // On success, the auth state changes automatically
            } catch (error) {
                // If registration fails, reset the button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // --- Handle Forgot Password Submission ---
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('forgot-email');
            const submitBtn = forgotForm.querySelector('button[type="submit"]');
            
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Sending...`;
            submitBtn.disabled = true;

            try {
                const success = await resetPassword(emailInput.value);
                if (success) {
                    // Send them back to the login screen so they can log in with their new password
                    forgotForm.classList.add('hidden');
                    loginForm.classList.remove('hidden');
                    emailInput.value = '';
                }
            } catch (error) {
                console.error(error);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}
