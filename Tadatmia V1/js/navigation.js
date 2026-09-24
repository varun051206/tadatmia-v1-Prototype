/**
 * Tadatmia V1 — SRM MCET Madurai
 * Navigation Module
 * Coordinates view transitions: Landing → Academic → Login → Dashboard
 */

export const Navigation = {
  currentView: 'landing',
  views: {},

  init() {
    this.views = {
      landing: document.getElementById('view-landing'),
      academic: document.getElementById('view-academic'),
      login: document.getElementById('view-login'),
      dashboard: document.getElementById('view-dashboard')
    };

    // Listen to hash changes if needed
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (this.views[hash]) {
        this.navigateTo(hash, false);
      }
    });

    // Handle initial route
    const initialHash = window.location.hash.replace('#', '');
    if (this.views[initialHash]) {
      this.navigateTo(initialHash, false);
    } else {
      this.navigateTo('landing', false);
    }
  },

  navigateTo(viewName, updateHash = true) {
    if (!this.views[viewName]) return;

    Object.entries(this.views).forEach(([name, el]) => {
      if (el) {
        if (name === viewName) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    this.currentView = viewName;
    if (updateHash) {
      window.location.hash = viewName;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
