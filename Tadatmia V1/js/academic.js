/**
 * Tadatmia V1 — SRM MCET Madurai
 * Academic Selection Module
 * Path: AIDS → 2nd Year → Section B
 */

export const AcademicManager = {
  selection: {
    department: 'AIDS',
    year: '2nd Year',
    section: 'Section B'
  },

  init({ onProceed }) {
    this.onProceed = onProceed;
    this.bindEvents();
  },

  bindEvents() {
    const proceedBtn = document.getElementById('btn-academic-proceed');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        if (typeof this.onProceed === 'function') {
          this.onProceed(this.selection);
        }
      });
    }

    // Inform user cleanly if they click locked prototype options
    const lockedPills = document.querySelectorAll('.option-pill.locked');
    lockedPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const title = pill.getAttribute('data-name') || 'Option';
        alert(`${title} is reserved for future batches. For this prototype, AIDS • 2nd Year • Section B is the active path.`);
      });
    });
  },

  getContextString() {
    return `${this.selection.department} • ${this.selection.year} • ${this.selection.section}`;
  }
};
