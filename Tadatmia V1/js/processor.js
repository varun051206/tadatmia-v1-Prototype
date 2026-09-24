/**
 * Tadatmia V1 — SRM MCET Madurai
 * Processor Module: Google Apps Script Web App Integration
 * 
 * Rules:
 * 1. Single API constant for the deployed Google Apps Script Web App.
 * 2. Real GET to load student database from Google Sheets.
 * 3. Real POST to send student emails via MailApp on Apps Script.
 * 4. Exact complete registration number matching (no prefix or partial matching).
 * 5. Dynamic message generation without hardcoding subjects.
 * 6. Absolutely NO mock student data, fake emails, or hardcoded records.
 * 7. In-memory runtime caching only (no localStorage).
 */

import { ExcelParser } from './excel-parser.js';

// Single Google Apps Script Web App API endpoint constant
export const API_URL = 'https://script.google.com/macros/s/AKfycbwDxfmneBhppikxl-ACoJR8ZBfwDBk6q-_BvmuHyTGvgwCsCojKz8tnfLVQ4ykiU1cH4w/exec';

export const Processor = {
  /**
   * In-memory runtime student database (never persisted to localStorage).
   */
  cachedStudents: [],
  lastLoadStatus: null,

  /**
   * Loads the student database from Google Sheets via the Apps Script Web App (GET).
   * 
   * @param {boolean} forceRefresh - If true, refetches from API
   * @returns {Promise<Array>} Array of normalized student objects { sNo, name, regNo, mail }
   */
  async loadStudents(forceRefresh = false) {
    if (!forceRefresh && this.cachedStudents.length > 0) {
      return this.cachedStudents;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script API responded with HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.success || !Array.isArray(data.students)) {
        this.cachedStudents = [];
        this.lastLoadStatus = {
          success: false,
          error: data?.error || 'Invalid student database response format.'
        };
        return [];
      }

      // Normalize records cleanly into { sNo, name, regNo, mail }
      this.cachedStudents = data.students.map((item, index) => {
        const rawReg = item.regNo ?? item['Reg No'] ?? item.reg_no ?? item['Register Number'] ?? item['Registration Number'] ?? '';
        const rawName = item.name ?? item['Name'] ?? item['Student Name'] ?? item.studentName ?? '';
        const rawMail = item.mail ?? item.email ?? item['Mail'] ?? item['Mail ID'] ?? item['Email'] ?? '';
        const rawSNo = item.sNo ?? item.sno ?? item['S.No'] ?? item['SNo'] ?? (index + 1);

        return {
          sNo: rawSNo,
          name: String(rawName).trim(),
          regNo: String(rawReg).trim(),
          mail: String(rawMail).trim()
        };
      });

      this.lastLoadStatus = {
        success: true,
        count: this.cachedStudents.length
      };

      return this.cachedStudents;
    } catch (err) {
      this.cachedStudents = [];
      this.lastLoadStatus = {
        success: false,
        error: err.message
      };
      throw err;
    }
  },

  /**
   * Matches registration numbers between uploaded Excel and class database.
   * STRICT: Uses exact normalized equality for the COMPLETE registration number.
   * Never uses startsWith(), includes(), or prefix matching.
   * 
   * @param {string} uploadedRegNo - Registration number from uploaded Excel row
   * @param {string} dbRegNo - Registration number from student database
   * @returns {boolean}
   */
  matchRegistrationNumber(uploadedRegNo, dbRegNo) {
    if (!uploadedRegNo || !dbRegNo) return false;
    const cleanUploaded = String(uploadedRegNo).trim();
    const cleanDb = String(dbRegNo).trim();
    return cleanUploaded === cleanDb;
  },

  /**
   * Generates dynamic student message formatted as:
   * Dear Parents,
   * 
   * Your ward's academic performance is given below:
   * 
   * Reg No : [Student Reg No]
   * 
   * [Dynamic academic columns]
   * 
   * Regards,
   * AIDS
   * SRM MCET
   * 
   * Never hardcodes subject names.
   * 
   * @param {Object} dynamicData - Dynamic key-value pairs from Excel row
   * @param {string} [regNo] - Student registration number
   * @returns {string} Formatted email body
   */
  generateMessage(dynamicData, regNo = '') {
    return ExcelParser.formatDynamicMessage(dynamicData, regNo);
  },

  /**
   * Sends an email for a matched student by calling the Apps Script Web App (POST).
   * Request body:
   * {
   *   "regNo": "911125243101",
   *   "subject": "Staff entered subject",
   *   "message": "Dynamic student-specific message"
   * }
   * 
   * @param {Object} payload
   * @param {string} payload.regNo
   * @param {string} payload.subject
   * @param {string} payload.message
   * @returns {Promise<Object>} API response
   */
  async sendStudentEmail({ regNo, subject, message }) {
    const postPayload = {
      regNo: String(regNo).trim(),
      subject: String(subject).trim(),
      message: String(message)
    };

    // Note: 'text/plain;charset=utf-8' is used to avoid CORS preflight rejection from Google Apps Script Web App
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(postPayload),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!response.ok) {
      throw new Error(`API HTTP Error: ${response.status}`);
    }

    const json = await response.json();
    return json;
  },

  /**
   * Processes the uploaded Excel file against the real Google Sheet student database.
   * Produces actual result statuses:
   * - Sent
   * - Failed — Reg No Missing
   * - Failed — Reg No Mismatch
   * - Failed — Mail Missing
   * - Failed — Error
   * 
   * @param {Object} params
   * @param {File} params.file - Selected Excel file
   * @param {string} params.subject - Message subject entered by staff
   * @returns {Promise<Object>} { success, results, totalProcessed, sentCount, failedCount }
   */
  async processBatch({ file, subject }) {
    // 1. Ensure students are loaded
    if (this.cachedStudents.length === 0) {
      try {
        await this.loadStudents();
      } catch (err) {
        console.warn('Could not reload students prior to batch:', err.message);
      }
    }

    // 2. Parse real uploaded Excel rows using SheetJS
    const parsedExcel = await ExcelParser.parseExcelRows(file);
    if (!parsedExcel.valid) {
      throw new Error(parsedExcel.error || 'Failed to parse Excel file.');
    }

    const { rows } = parsedExcel;
    if (rows.length === 0) {
      throw new Error('No data rows found in the uploaded Excel sheet.');
    }

    const results = [];

    // 3. Process each row sequentially against real database & send email if matched
    for (let i = 0; i < rows.length; i++) {
      const rowItem = rows[i];
      const sNo = i + 1;
      const uploadedReg = rowItem.regNo ? String(rowItem.regNo).trim() : '';

      // Case: Missing Registration Number
      if (!uploadedReg) {
        const dynamicMsg = this.generateMessage(rowItem.dynamicData, '');
        results.push({
          sNo: sNo,
          studentName: '—',
          regNo: '—',
          mail: '—',
          status: 'Failed — Reg No Missing',
          statusType: 'error',
          dynamicMessage: dynamicMsg,
          errorDetails: 'Excel row has no registration number.'
        });
        continue;
      }

      // Case: Exact Match against Google Sheet database
      const matchedStudent = this.cachedStudents.find(s =>
        this.matchRegistrationNumber(uploadedReg, s.regNo)
      );

      // Case: Registration Number Mismatch
      if (!matchedStudent) {
        const dynamicMsg = this.generateMessage(rowItem.dynamicData, uploadedReg);
        results.push({
          sNo: sNo,
          studentName: '—',
          regNo: uploadedReg,
          mail: '—',
          status: 'Failed — Reg No Mismatch',
          statusType: 'error',
          dynamicMessage: dynamicMsg,
          errorDetails: 'Registration number does not match any Google Sheet record.'
        });
        continue;
      }

      const dynamicMsg = this.generateMessage(rowItem.dynamicData, matchedStudent.regNo);

      // Case: Matched student, but Mail is missing in Google Sheet
      const studentMail = matchedStudent.mail ? String(matchedStudent.mail).trim() : '';
      if (!studentMail) {
        results.push({
          sNo: sNo,
          studentName: matchedStudent.name || '—',
          regNo: matchedStudent.regNo,
          mail: '—',
          status: 'Failed — Mail Missing',
          statusType: 'error',
          dynamicMessage: dynamicMsg,
          errorDetails: 'No email address registered in student database.'
        });
        continue;
      }

      // Case: Send Email via Apps Script Web App
      try {
        const sendResult = await this.sendStudentEmail({
          regNo: matchedStudent.regNo,
          subject: subject,
          message: dynamicMsg
        });

        if (sendResult && sendResult.success) {
          results.push({
            sNo: sNo,
            studentName: matchedStudent.name || '—',
            regNo: matchedStudent.regNo,
            mail: studentMail,
            status: 'Sent',
            statusType: 'success',
            dynamicMessage: dynamicMsg,
            errorDetails: null
          });
        } else {
          const errMsg = sendResult?.error || sendResult?.status || 'Apps Script dispatch failed.';
          results.push({
            sNo: sNo,
            studentName: matchedStudent.name || '—',
            regNo: matchedStudent.regNo,
            mail: studentMail,
            status: 'Failed — Error',
            statusType: 'error',
            dynamicMessage: dynamicMsg,
            errorDetails: errMsg
          });
        }
      } catch (sendErr) {
        results.push({
          sNo: sNo,
          studentName: matchedStudent.name || '—',
          regNo: matchedStudent.regNo,
          mail: studentMail,
          status: 'Failed — Error',
          statusType: 'error',
          dynamicMessage: dynamicMsg,
          errorDetails: sendErr.message
        });
      }
    }

    const sentCount = results.filter(r => r.status === 'Sent').length;
    const failedCount = results.length - sentCount;

    return {
      success: true,
      results: results,
      totalProcessed: results.length,
      sentCount: sentCount,
      failedCount: failedCount
    };
  }
};
