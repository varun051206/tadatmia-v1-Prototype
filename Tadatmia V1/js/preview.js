/**
 * Tadatmia V1 — SRM MCET Madurai
 * Preview Module (Message Preview Modal)
 * 
 * Rules:
 * 1. Shows dynamic message and student data ONLY when a real matched student record exists.
 * 2. If no matched record: retains honest empty state ("Message preview unavailable").
 * 3. Never invents fake students or fake marks.
 */

export const PreviewModal = {
  backdropEl: null,
  subjectDisplayEl: null,
  bodyContainerEl: null,

  init({ backdropEl, subjectDisplayEl, bodyContainerEl }) {
    this.backdropEl = backdropEl;
    this.subjectDisplayEl = subjectDisplayEl;
    this.bodyContainerEl = bodyContainerEl;

    this.bindEvents();
  },

  bindEvents() {
    if (!this.backdropEl) return;

    // Close on backdrop click (outside card)
    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.close();
      }
    });

    // Close buttons
    const closeBtns = this.backdropEl.querySelectorAll('[data-modal-close]');
    closeBtns.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.backdropEl.classList.contains('active')) {
        this.close();
      }
    });
  },

  /**
   * Opens preview modal.
   * If a matched record with dynamicMessage is provided, renders the real student message.
   * Otherwise renders the honest empty state.
   * 
   * @param {Object} params
   * @param {string} params.subject - Staff entered subject
   * @param {Object} [params.record] - Processed student result record (optional)
   */
  open({ subject, record = null }) {
    if (!this.backdropEl) return;

    const displaySubject = subject && subject.trim() ? subject.trim() : 'No subject specified';
    if (this.subjectDisplayEl) {
      this.subjectDisplayEl.textContent = displaySubject;
    }

    const hasMatchedData = record && record.dynamicMessage && record.status === 'Sent';

    if (this.bodyContainerEl) {
      if (hasMatchedData) {
        // Real matched student preview
        this.bodyContainerEl.innerHTML = `
          <div style="background-color: var(--c-2-ink-tint); border: 1px solid var(--c-3-border); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-md);">
            <div style="font-size: 0.85rem; color: var(--c-4-ink-muted); margin-bottom: 4px;">Recipient:</div>
            <div style="font-weight: 600; color: var(--c-5-ink-dark);">${this.escapeHtml(record.studentName)} (${this.escapeHtml(record.regNo)})</div>
            <div style="font-size: 0.85rem; color: var(--c-4-ink-muted);">${this.escapeHtml(record.mail)}</div>
          </div>
          <div style="background-color: var(--c-1-white); border: 1px solid var(--c-3-border); border-radius: var(--radius-md); padding: var(--space-md); white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; color: var(--c-5-ink-dark);">
${this.escapeHtml(record.dynamicMessage)}
          </div>
        `;
      } else {
        // Empty preview state
        this.bodyContainerEl.innerHTML = `
          <div class="empty-state" style="padding: var(--space-xl) var(--space-sm);">
            <div class="empty-state-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
              </svg>
            </div>
            <div class="empty-state-title">Message preview unavailable</div>
            <div class="empty-state-desc">A matched student record is required to generate a message preview.</div>
          </div>
        `;
      }
    }

    this.backdropEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    if (!this.backdropEl) return;
    this.backdropEl.classList.remove('active');
    document.body.style.overflow = '';
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
