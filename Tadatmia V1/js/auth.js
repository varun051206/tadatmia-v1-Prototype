/**
 * Tadatmia V1 — SRM MCET Madurai
 * Staff Auth Module (Frontend Prototype Only)
 * Context: AIDS • 2nd Year • Section B
 */

export const AuthManager = {
  currentUser: null,
  onLoginSuccess: null,
  onLogout: null,

  init({ formEl, usernameInputEl, passwordInputEl, onLoginSuccess, onLogout }) {
    this.form = formEl;
    this.usernameInput = usernameInputEl;
    this.passwordInput = passwordInputEl;
    this.onLoginSuccess = onLoginSuccess;
    this.onLogout = onLogout;

    this.bindEvents();
  },

  bindEvents() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    const logoutBtn = document.getElementById('btn-staff-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.logout();
      });
    }
  },

  handleLogin() {
    const username = this.usernameInput?.value?.trim() || '';
    const password = this.passwordInput?.value || '';

    if (!username) {
      alert('Please enter your faculty username or email.');
      this.usernameInput?.focus();
      return;
    }

    if (!password) {
      alert('Please enter your password.');
      this.passwordInput?.focus();
      return;
    }

    // Prototype authentication state
    this.currentUser = {
      username: username,
      department: 'AIDS',
      year: '2nd Year',
      section: 'Section B',
      role: 'Staff'
    };

    if (typeof this.onLoginSuccess === 'function') {
      this.onLoginSuccess(this.currentUser);
    }
  },

  logout() {
    this.currentUser = null;
    if (this.passwordInput) this.passwordInput.value = '';
    if (typeof this.onLogout === 'function') {
      this.onLogout();
    }
  }
};
