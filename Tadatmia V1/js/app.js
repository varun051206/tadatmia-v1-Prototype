/**
 * Tadatmia V1 — SRM MCET Madurai
 * Main Application Orchestrator (Batch 2 Google Apps Script Integration)
 */

import { Navigation } from './navigation.js';
import { AcademicManager } from './academic.js';
import { AuthManager } from './auth.js';
import { UploadManager } from './upload.js';
import { Processor } from './processor.js';
import { ResultManager } from './result.js';
import { PreviewModal } from './preview.js';

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const btnLandingContinue = document.getElementById('btn-landing-continue');
  const btnAcademicBack = document.getElementById('btn-academic-back');
  const btnLoginBack = document.getElementById('btn-login-back');
  const subjectInput = document.getElementById('input-message-subject');
  const btnSendMessage = document.getElementById('btn-send-message');
  const processingState = document.getElementById('processing-indicator');
  const systemStateBanner = document.getElementById('system-state-banner');
  const btnPreviewTrigger = document.getElementById('btn-open-preview');
  const studentListContainer = document.getElementById('student-list-container');
  const badgeStudentDb = document.getElementById('badge-student-db');
  const btnSyncStudents = document.getElementById('btn-sync-students');

  // Track latest batch results in memory for general preview
  let currentBatchResults = [];

  // Initialize Navigation
  Navigation.init();

  // Landing Flow
  btnLandingContinue?.addEventListener('click', () => {
    Navigation.navigateTo('academic');
  });

  // Academic Flow
  AcademicManager.init({
    onProceed: () => {
      Navigation.navigateTo('login');
    }
  });

  btnAcademicBack?.addEventListener('click', () => {
    Navigation.navigateTo('landing');
  });

  // Auth Flow
  AuthManager.init({
    formEl: document.getElementById('form-staff-login'),
    usernameInputEl: document.getElementById('input-username'),
    passwordInputEl: document.getElementById('input-password'),
    onLoginSuccess: (user) => {
      // Update staff identifier in header
      const userDisplay = document.getElementById('display-staff-id');
      if (userDisplay) {
        userDisplay.textContent = user.username.split('@')[0] || 'Faculty Access';
      }
      Navigation.navigateTo('dashboard');
      // Load Google Sheet student database upon opening dashboard
      refreshStudentDatabase();
    },
    onLogout: () => {
      Navigation.navigateTo('login');
    }
  });

  btnLoginBack?.addEventListener('click', () => {
    Navigation.navigateTo('academic');
  });

  // Result Manager
  ResultManager.init({
    containerEl: document.getElementById('message-status-table-container'),
    toastEl: document.getElementById('toast-feedback'),
    onPreviewRow: (record) => {
      const currentSubject = subjectInput?.value?.trim() || '';
      PreviewModal.open({ subject: currentSubject, record });
    }
  });

  // Preview Modal
  PreviewModal.init({
    backdropEl: document.getElementById('modal-message-preview'),
    subjectDisplayEl: document.getElementById('preview-subject-text'),
    bodyContainerEl: document.getElementById('preview-dynamic-body')
  });

  // General Preview button in header
  btnPreviewTrigger?.addEventListener('click', () => {
    const currentSubject = subjectInput?.value?.trim() || '';
    const firstMatched = currentBatchResults.find(r => r.status === 'Sent');
    PreviewModal.open({ subject: currentSubject, record: firstMatched || null });
  });

  // Function to validate Send Message readiness
  function updateSendButtonState() {
    const hasFile = !!UploadManager.selectedFile;
    const hasSubject = !!(subjectInput?.value?.trim().length > 0);

    if (btnSendMessage) {
      btnSendMessage.disabled = !(hasFile && hasSubject);
    }
  }

  // Upload Manager
  UploadManager.init({
    dropzoneEl: document.getElementById('upload-dropzone'),
    fileInputEl: document.getElementById('file-input-excel'),
    fileDisplayEl: document.getElementById('file-selected-display'),
    onFileChange: () => {
      if (systemStateBanner) systemStateBanner.classList.remove('active');
      updateSendButtonState();
    }
  });

  // Subject Input Listener
  subjectInput?.addEventListener('input', () => {
    updateSendButtonState();
  });

  // Manual Sync Button
  btnSyncStudents?.addEventListener('click', async () => {
    await refreshStudentDatabase(true);
    ResultManager.showToast('Student database synced with Google Sheets.');
  });

  /**
   * Loads real student database from Google Sheets via Apps Script Web App.
   * Renders real records if available, or preserves the requested empty state.
   * 
   * @param {boolean} forceRefresh
   */
  async function refreshStudentDatabase(forceRefresh = false) {
    if (!studentListContainer) return;

    if (badgeStudentDb) {
      badgeStudentDb.textContent = 'Connecting...';
      badgeStudentDb.className = 'badge badge-subtle';
    }

    try {
      const students = await Processor.loadStudents(forceRefresh);

      if (students.length > 0) {
        // Real students returned from Google Sheet
        if (badgeStudentDb) {
          badgeStudentDb.textContent = `${students.length} Students Connected`;
          badgeStudentDb.className = 'badge badge-gold';
        }

        const rowsHtml = students.map(s => `
          <tr>
            <td>${s.sNo}</td>
            <td><strong>${escapeHtml(s.name)}</strong></td>
            <td class="mono">${escapeHtml(s.regNo)}</td>
            <td class="text-subtle">${escapeHtml(s.mail)}</td>
          </tr>
        `).join('');

        studentListContainer.innerHTML = `
          <table class="proto-table">
            <thead>
              <tr>
                <th style="width: 70px;">S.No</th>
                <th>Name</th>
                <th>Reg No</th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
      } else {
        // Zero students returned: Keep requested empty state
        if (badgeStudentDb) {
          badgeStudentDb.textContent = '0 Students Connected';
          badgeStudentDb.className = 'badge badge-subtle';
        }

        studentListContainer.innerHTML = `
          <table class="proto-table">
            <thead>
              <tr>
                <th style="width: 70px;">S.No</th>
                <th>Name</th>
                <th>Reg No</th>
                <th>Mail</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" style="padding: 0;">
                  <div class="empty-state">
                    <div class="empty-state-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                      </svg>
                    </div>
                    <div class="empty-state-title">Student records will appear here</div>
                    <div class="empty-state-desc">Connect the Section B database to load student records.</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        `;
      }
    } catch (err) {
      if (badgeStudentDb) {
        badgeStudentDb.textContent = 'Connection Error';
        badgeStudentDb.className = 'badge badge-subtle';
      }

      studentListContainer.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl);">
          <div class="empty-state-title" style="color: var(--c-5-ink-dark);">Unable to reach Google Sheet database</div>
          <div class="empty-state-desc">${escapeHtml(err.message)}</div>
          <button type="button" class="btn btn-secondary" id="btn-retry-student-load" style="margin-top: var(--space-sm); font-size: 0.85rem;">
            Retry Connection
          </button>
        </div>
      `;

      document.getElementById('btn-retry-student-load')?.addEventListener('click', () => refreshStudentDatabase(true));
    }
  }

  // Real Send Message Batch Processing Flow
  btnSendMessage?.addEventListener('click', async () => {
    if (!UploadManager.selectedFile || !subjectInput?.value?.trim()) return;

    btnSendMessage.disabled = true;
    if (processingState) processingState.classList.add('active');
    if (systemStateBanner) systemStateBanner.classList.remove('active');

    try {
      const batchResult = await Processor.processBatch({
        file: UploadManager.selectedFile,
        subject: subjectInput.value.trim()
      });

      currentBatchResults = batchResult.results || [];

      // Render actual results into Message Status table
      ResultManager.renderResults(currentBatchResults);

      // Processing done
      if (processingState) processingState.classList.remove('active');

      // Update System Banner with honest processing summary
      if (systemStateBanner) {
        systemStateBanner.classList.add('active');
        const titleEl = systemStateBanner.querySelector('.system-state-title');
        const textEl = systemStateBanner.querySelector('.system-state-text');

        if (batchResult.sentCount > 0) {
          if (titleEl) titleEl.textContent = `${batchResult.sentCount} of ${batchResult.totalProcessed} Messages Dispatched Successfully`;
          if (textEl) textEl.textContent = `Dispatched via Google Apps Script MailApp. (${batchResult.failedCount} failures/unmatched).`;
        } else {
          if (titleEl) titleEl.textContent = `Processed ${batchResult.totalProcessed} Records`;
          if (textEl) textEl.textContent = `0 sent, ${batchResult.failedCount} failed/unmatched. Review the Message Status table below for details.`;
        }

        systemStateBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } catch (err) {
      if (processingState) processingState.classList.remove('active');
      alert(`Processing error: ${err.message}`);
    } finally {
      updateSendButtonState();
    }
  });

  // If user navigated directly into dashboard via hash
  if (window.location.hash === '#dashboard') {
    refreshStudentDatabase();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
