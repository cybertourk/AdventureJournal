import { loginUser, registerUser } from './firebase-manager.js';

export function initAuthUI() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');

    // --- Toggle Forms ---
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            registerForm.classList.add('hidden');
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
            submitBtn.textContent = "Accessing...";
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
            
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            // Basic UI feedback
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Forging...";
            submitBtn.disabled = true;

            try {
                // Everyone is a generic 'user' now! No more strict DM/Player separation.
                await registerUser(emailInput.value, passwordInput.value, 'user');
                // On success, the auth state changes automatically
            } catch (error) {
                // If registration fails, reset the button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
}
