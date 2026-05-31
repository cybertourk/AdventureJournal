import { loginUser, registerUser, resetPassword, logoutUser } from './firebase-manager.js';

// Export bindings to window so inline HTML onclick handlers and main.js can reach them
if (typeof window !== 'undefined') {
    window.appActions = window.appActions || {};
    window.appActions.logoutUser = logoutUser;
    
    window.appActions.showAuthenticatedReadyState = (user) => {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            // Flag the form so the submit event knows we are just "entering" the app
            loginForm.dataset.ready = "true";
            
            // Hide input containers (divs that contain an input element)
            const divs = loginForm.querySelectorAll('div');
            divs.forEach(div => {
                if (div.querySelector('input')) {
                    div.classList.add('hidden');
                }
            });
            
            // Hide the standard bottom register link
            const bottomLinks = loginForm.querySelector('.text-center.mt-4:not(#auth-switch-account-btn)');
            if (bottomLinks) bottomLinks.classList.add('hidden');
            
            // Morph the submit button to act as our entry portal
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = `<i class="fa-solid fa-door-open mr-2"></i> Enter Archives`;
                submitBtn.disabled = false;
            }

            // Dynamically inject a Sign Out button in case they want to switch accounts
            let switchBtn = document.getElementById('auth-switch-account-btn');
            if (!switchBtn) {
                switchBtn = document.createElement('div');
                switchBtn.id = 'auth-switch-account-btn';
                switchBtn.className = 'text-center mt-5 animate-in fade-in';
                switchBtn.innerHTML = `<button type="button" onclick="window.appActions.logoutUser()" class="text-stone-500 hover:text-red-900 text-[10px] font-bold uppercase tracking-widest transition"><i class="fa-solid fa-right-from-bracket mr-1.5"></i> Sign Out / Switch Account</button>`;
                loginForm.appendChild(switchBtn);
            } else {
                switchBtn.classList.remove('hidden');
            }
        }
    };

    window.appActions.resetAuthUI = () => {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            // Remove the ready flag to restore standard login behavior
            loginForm.dataset.ready = "false";
            
            // Unhide input containers
            const divs = loginForm.querySelectorAll('div');
            divs.forEach(div => {
                if (div.querySelector('input')) {
                    div.classList.remove('hidden');
                }
            });
            
            // Unhide register link
            const bottomLinks = loginForm.querySelector('.text-center.mt-4:not(#auth-switch-account-btn)');
            if (bottomLinks) bottomLinks.classList.remove('hidden');
            
            // Restore original button text
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = `Access Archives`;
                submitBtn.disabled = false;
            }

            // Hide the switch account button
            const switchBtn = document.getElementById('auth-switch-account-btn');
            if (switchBtn) switchBtn.classList.add('hidden');
            
            // Clear password field for security
            const passwordInput = document.getElementById('login-password');
            if (passwordInput) passwordInput.value = '';
        }
    };
}

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
            e.preventDefault(); 
            
            // If the user was already authenticated via persistent session, 
            // clicking the button bypasses login and routes them into the app!
            if (loginForm.dataset.ready === "true") {
                if (window.appActions && window.appActions.enterApp) {
                    window.appActions.enterApp();
                }
                return;
            }
            
            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            // Basic UI feedback
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Accessing...`;
            submitBtn.disabled = true;

            try {
                await loginUser(emailInput.value, passwordInput.value);
                passwordInput.value = '';
                
                // NEW: Automatically push the user into the app upon successful manual login
                if (window.appActions && window.appActions.enterApp) {
                    window.appActions.enterApp();
                }
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
            e.preventDefault(); 
            
            const displayNameInput = document.getElementById('register-display-name');
            const emailInput = document.getElementById('register-email');
            const passwordInput = document.getElementById('register-password');
            
            const birthMonthInput = document.getElementById('register-birth-month');
            const birthDayInput = document.getElementById('register-birth-day');
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            
            const originalText = submitBtn.textContent;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Forging...`;
            submitBtn.disabled = true;

            try {
                const bMonth = birthMonthInput ? birthMonthInput.value : null;
                const bDay = birthDayInput ? birthDayInput.value : null;

                await registerUser(emailInput.value, passwordInput.value, displayNameInput.value, bMonth, bDay, 'user');
                
                // NEW: Automatically push the user into the app upon successful registration
                if (window.appActions && window.appActions.enterApp) {
                    window.appActions.enterApp();
                }
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
