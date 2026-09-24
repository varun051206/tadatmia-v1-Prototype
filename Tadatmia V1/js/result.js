/**
 * Tadatmia V1 — SRM MCET Madurai
 * Result Module (Message Status Table & Export Actions)
 * 
 * Rules:
 * 1. Shows actual processed results from uploaded Excel and Google Sheets.
 * 2. If no results exist: shows honest empty state ("No message results yet").
 * 3. Supports row-level Preview for matched dynamic messages.
 * 4. PDF / XLS / DOC controls work ONLY when real result records exist.
 */

export const ResultManager = {
  containerEl: null,
  toastEl: null,
  results: [],
  onPreviewRowCallback: null,

  init({ containerEl, toastEl, onPreviewRow }) {
    this.containerEl = containerEl;
    this.toastEl = toastEl;
    this.onPreviewRowCallback = onPreviewRow;

    this.renderInitialEmptyState();
    this.bindDownloadActions();
  },

  showToast(message) {
    if (!this.toastEl) return;
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 3200);
  },

  renderInitialEmptyState() {
    if (!this.containerEl) return;
    this.results = [];

    this.containerEl.innerHTML = `
      <div class="table-responsive">
        <table class="proto-table">
          <thead>
            <tr>
              <th style="width: 60px;">S.No</th>
              <th>Student Name</th>
              <th>Reg No</th>
              <th>Mail ID</th>
              <th style="width: 200px;">Send Status</th>
              <th style="width: 90px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="6" style="padding: 0;">
                <div class="empty-state">
                  <div class="empty-state-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <div class="empty-state-title">No message results yet</div>
                  <div class="empty-state-desc">Results will appear here after the Section B database is connected and the uploaded Excel is processed.</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Renders real results from batch processing.
   * @param {Array} results - List of processed result records
   */
  renderResults(results) {
    if (!this.containerEl) return;
    this.results = results || [];

    if (this.results.length === 0) {
      this.renderInitialEmptyState();
      return;
    }

    const rowsHtml = this.results.map((item, index) => {
      const isSuccess = item.status === 'Sent';
      const badgeClass = isSuccess ? 'badge-gold' : 'badge-subtle';
      const tooltip = item.errorDetails ? `title="${this.escapeHtml(item.errorDetails)}"` : '';

      return `
        <tr>
          <td>${item.sNo}</td>
          <td><strong>${this.escapeHtml(item.studentName)}</strong></td>
          <td class="mono">${this.escapeHtml(item.regNo)}</td>
          <td class="text-subtle">${this.escapeHtml(item.mail)}</td>
          <td>
            <span class="badge ${badgeClass}" ${tooltip}>
              ${this.escapeHtml(item.status)}
            </span>
          </td>
          <td style="text-align: right;">
            <button type="button" class="btn btn-ghost btn-preview-item" data-index="${index}" style="font-size: 0.8rem; padding: 4px 8px;">
              Preview
            </button>
          </td>
        </tr>
      `;
    }).join('');

    this.containerEl.innerHTML = `
      <div class="table-responsive">
        <table class="proto-table">
          <thead>
            <tr>
              <th style="width: 60px;">S.No</th>
              <th>Student Name</th>
              <th>Reg No</th>
              <th>Mail ID</th>
              <th style="width: 200px;">Send Status</th>
              <th style="width: 90px; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    // Bind preview buttons
    const previewBtns = this.containerEl.querySelectorAll('.btn-preview-item');
    previewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const record = this.results[idx];
        if (record && typeof this.onPreviewRowCallback === 'function') {
          this.onPreviewRowCallback(record);
        }
      });
    });
  },

  bindDownloadActions() {
    const downloadBtns = document.querySelectorAll('[data-download-format]');
    downloadBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const format = btn.getAttribute('data-download-format');

        if (!this.results || this.results.length === 0) {
          this.showToast('No results available for download.');
          return;
        }

        this.exportResults(format);
      });
    });
  },

  /**
   * Generates real downloads for current session results without external backend.
   * @param {string} format - 'excel' | 'pdf' | 'word'
   */
  exportResults(format) {
    if (this.results.length === 0) {
      this.showToast('No results available for download.');
      return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileNameBase = `Tadatmia_Results_AIDS_2ndYear_SecB_${timestamp}`;

    if (format === 'excel') {
      // Export CSV using data
      const csvHeaders = ['S.No', 'Student Name', 'Reg No', 'Mail ID', 'Send Status', 'Details'];
      const csvRows = this.results.map(r => [
        r.sNo,
        `"${(r.studentName || '').replace(/"/g, '""')}"`,
        `"${(r.regNo || '').replace(/"/g, '""')}"`,
        `"${(r.mail || '').replace(/"/g, '""')}"`,
        `"${(r.status || '').replace(/"/g, '""')}"`,
        `"${(r.errorDetails || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileNameBase}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Downloaded Results CSV/Excel.');
    } else if (format === 'word') {
      // Word-compatible HTML Document
      const docHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Tadatmia Results</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h2>SRM MCET Madurai — Tadatmia V1</h2>
          <h3>Message Dispatch Status: AIDS • 2nd Year • Section B</h3>
          <p>Export Date: ${new Date().toLocaleString()}</p>
          <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th>S.No</th><th>Student Name</th><th>Reg No</th><th>Mail ID</th><th>Status</th><th>Details</th>
              </tr>
            </thead>
            <tbody>
              ${this.results.map(r => `
                <tr>
                  <td>${r.sNo}</td>
                  <td>${this.escapeHtml(r.studentName)}</td>
                  <td>${this.escapeHtml(r.regNo)}</td>
                  <td>${this.escapeHtml(r.mail)}</td>
                  <td>${this.escapeHtml(r.status)}</td>
                  <td>${this.escapeHtml(r.errorDetails || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body></html>
      `;

      const blob = new Blob(['\ufeff' + docHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileNameBase}.doc`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Downloaded Results Word document.');
    } else if (format === 'pdf') {
      // Trigger printable PDF dialog
      window.print();
    }
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
