/**
 * Tadatmia V1 — SRM MCET Madurai
 * Upload Marks Module
 * Handles drag-and-drop, file picking, format verification, and SheetJS inspection.
 */

import { ExcelParser } from './excel-parser.js';

export const UploadManager = {
  selectedFile: null,
  inspectionData: null,
  onFileChangeCallback: null,

  init({ dropzoneEl, fileInputEl, fileDisplayEl, onFileChange }) {
    this.dropzone = dropzoneEl;
    this.fileInput = fileInputEl;
    this.fileDisplay = fileDisplayEl;
    this.onFileChangeCallback = onFileChange;

    this.bindEvents();
  },

  bindEvents() {
    if (!this.dropzone || !this.fileInput) return;

    // Click on dropzone opens native file picker
    this.dropzone.addEventListener('click', () => {
      this.fileInput.click();
    });

    // File input change
    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleFile(file);
    });

    // Drag over & enter
    ['dragenter', 'dragover'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.add('drag-active');
      });
    });

    // Drag leave & drop
    ['dragleave', 'dragend'].forEach(eventName => {
      this.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.dropzone.classList.remove('drag-active');
      });
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropzone.classList.remove('drag-active');

      const file = e.dataTransfer?.files?.[0];
      if (file) this.handleFile(file);
    });
  },

  formatBytes(bytes, decimals = 1) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  isValidExcelFile(file) {
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  },

  async handleFile(file) {
    if (!this.isValidExcelFile(file)) {
      alert('Please upload a valid Excel file (.xlsx or .xls).');
      return;
    }

    this.selectedFile = file;

    // Inspect file using SheetJS
    try {
      this.inspectionData = await ExcelParser.inspectExcelFile(file);
    } catch (err) {
      console.warn('Inspection note:', err.message);
      this.inspectionData = null;
    }

    this.renderSelectedState();

    if (typeof this.onFileChangeCallback === 'function') {
      this.onFileChangeCallback(this.selectedFile, this.inspectionData);
    }
  },

  removeFile() {
    this.selectedFile = null;
    this.inspectionData = null;
    this.fileInput.value = '';

    if (this.dropzone) this.dropzone.style.display = 'flex';
    if (this.fileDisplay) {
      this.fileDisplay.style.display = 'none';
      this.fileDisplay.innerHTML = '';
    }

    if (typeof this.onFileChangeCallback === 'function') {
      this.onFileChangeCallback(null, null);
    }
  },

  renderSelectedState() {
    if (!this.selectedFile || !this.fileDisplay || !this.dropzone) return;

    this.dropzone.style.display = 'none';
    this.fileDisplay.style.display = 'block';

    const ext = this.selectedFile.name.split('.').pop().toUpperCase();
    const sizeStr = this.formatBytes(this.selectedFile.size);

    let inspectionHtml = '';
    if (this.inspectionData && this.inspectionData.valid) {
      const regBadge = this.inspectionData.detectedRegColumn
        ? `<span class="badge badge-gold">Registration Column: <strong>${this.escapeHtml(this.inspectionData.detectedRegColumn)}</strong></span>`
        : `<span class="badge badge-subtle">Reg column pending match</span>`;

      const headerCount = this.inspectionData.headers.length;
      const sheetName = this.inspectionData.activeSheet || 'Sheet 1';

      inspectionHtml = `
        <div class="inspection-badge-tray">
          <span class="badge badge-subtle">Sheet: ${this.escapeHtml(sheetName)}</span>
          <span class="badge badge-subtle">${headerCount} Columns Detected</span>
          ${regBadge}
        </div>
      `;
    }

    this.fileDisplay.innerHTML = `
      <div class="file-selected-card">
        <div class="file-info-group">
          <div class="file-icon">${ext}</div>
          <div class="file-meta-text">
            <div class="file-name" title="${this.escapeHtml(this.selectedFile.name)}">${this.escapeHtml(this.selectedFile.name)}</div>
            <div class="file-size-type">${sizeStr} • Microsoft Excel (${ext})</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-ghost" id="btn-change-file" style="font-size: 0.85rem;">Change</button>
          <button type="button" class="btn btn-ghost" id="btn-remove-file" style="font-size: 0.85rem; color: var(--c-4-ink-muted);">Remove</button>
        </div>
      </div>
      ${inspectionHtml}
    `;

    // Bind remove and change actions
    document.getElementById('btn-remove-file')?.addEventListener('click', () => this.removeFile());
    document.getElementById('btn-change-file')?.addEventListener('click', () => this.fileInput.click());
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
