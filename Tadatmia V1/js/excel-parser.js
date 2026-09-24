/**
 * Tadatmia V1 — SRM MCET Madurai
 * Excel Parser Module (Client-Side Format Inspection & Row Parsing via SheetJS)
 * 
 * Rules:
 * 1. Uses SheetJS strictly for client-side .xlsx/.xls file inspection and row extraction.
 * 2. NO mock student data, fake rows, or hardcoded student databases.
 * 3. Dynamic header detection without hardcoding subjects.
 * 4. Flexible registration column recognition across known naming patterns.
 */

export const ExcelParser = {
  /**
   * Recognized header variations for student registration numbers.
   * Matching is case-insensitive and trims underscores, spaces, dots, and hyphens.
   */
  REG_NO_PATTERNS: [
    'regno',
    'reg_no',
    'reg no',
    'register number',
    'register no',
    'registration number',
    'registration no',
    'rollno',
    'roll number',
    'roll no',
    'register',
    'registration'
  ],

  /**
   * Recognized header variations for Serial Number columns.
   * Normalized variations (lowercase, without spaces, dots, underscores, hyphens).
   */
  SERIAL_NO_PATTERNS: [
    'sno',
    'slno',
    'srno',
    'serialno',
    'serialnumber',
    'serialnum',
    'serial',
    'slnumber',
    'slnum',
    'srnumber',
    'srnum',
    'snumber',
    'snum'
  ],

  /**
   * Recognized header variations for non-academic metadata columns.
   * Normalized variations (lowercase, without spaces, dots, underscores, hyphens).
   */
  METADATA_PATTERNS: [
    // Identity & Demographics
    'name',
    'studentname',
    'student',
    'candidatename',
    'pupilname',
    'wardname',
    'parentname',
    'fathername',
    'mothername',

    // Email / Contact
    'mail',
    'email',
    'mailid',
    'emailid',
    'studentmail',
    'parentmail',
    'studentemail',
    'parentemail',
    'mailaddress',
    'emailaddress',
    'gmail',
    'phone',
    'phoneno',
    'phonenumber',
    'mobile',
    'mobileno',
    'mobilenumber',
    'contact',
    'contactno',
    'contactnumber',
    'cell',
    'cellno',

    // Institutional / Class Grouping
    'branch',
    'branchname',
    'dept',
    'department',
    'deptname',
    'departmentname',
    'class',
    'classname',
    'section',
    'sec',
    'sectionname',
    'year',
    'academicyear',
    'batch',
    'degree',
    'course',
    'semester',
    'sem',

    // Personal / Profile
    'gender',
    'dob',
    'dateofbirth',
    'bloodgroup',
    'bloodgrp',
    'address',

    // System-generated text variations (Rule 9)
    'dearparents',
    'regards',
    'srmmcet',
    'aids',
    'performance',
    'academicperformance'
  ],

  /**
   * Normalizes header strings for flexible matching.
   * Rule 3:
   * - convert to lowercase
   * - remove spaces
   * - remove dots
   * - remove underscores
   * - remove hyphens
   * @param {string} header
   * @returns {string}
   */
  normalizeHeader(header) {
    if (header === undefined || header === null) return '';
    return String(header)
      .toLowerCase()
      .replace(/[\s._-]+/g, '')
      .trim();
  },

  /**
   * Identifies whether a given column header represents a registration number.
   * @param {string} header
   * @returns {boolean}
   */
  isRegistrationColumn(header) {
    const normalized = this.normalizeHeader(header);
    if (!normalized) return false;
    return this.REG_NO_PATTERNS.some(pattern => this.normalizeHeader(pattern) === normalized);
  },

  /**
   * Identifies whether a given column header represents a serial number column.
   * Rules 1, 2, 3:
   * - Recognizes S.No, s.no, S.NO, s no, S N O, s n o, S_No, S-No, Serial No, Serial Number, Sl.No, Sl No, SL.NO, etc.
   * @param {string} header
   * @returns {boolean}
   */
  isSerialNumberColumn(header) {
    const normalized = this.normalizeHeader(header);
    if (!normalized) return false;
    if (this.SERIAL_NO_PATTERNS.includes(normalized)) return true;
    return /^(s|sl|sr)(no|num|number)$/i.test(normalized) || /^serial(no|num|number)?$/i.test(normalized);
  },

  /**
   * Identifies whether a column header represents non-academic metadata.
   * Rule 4: Do NOT display Branch, Dept, Class, Section, Mail, or other non-academic metadata.
   * @param {string} header
   * @returns {boolean}
   */
  isMetadataColumn(header) {
    if (!header) return true;
    if (this.isSerialNumberColumn(header)) return true;
    if (this.isRegistrationColumn(header)) return true;
    const normalized = this.normalizeHeader(header);
    if (!normalized) return true;
    return this.METADATA_PATTERNS.includes(normalized);
  },

  /**
   * Checks if a cell value should be ignored (empty, null, undefined, NaN).
   * Rule 8: Ignore empty, null, undefined, or NaN values.
   * Note: Numeric 0 is a valid academic mark and is NOT ignored.
   * @param {*} val
   * @returns {boolean}
   */
  isEmptyOrInvalidValue(val) {
    if (val === undefined || val === null) return true;
    if (typeof val === 'number') {
      return Number.isNaN(val);
    }
    const str = String(val).trim();
    if (str.length === 0) return true;
    const lower = str.toLowerCase();
    if (lower === 'nan' || lower === 'undefined' || lower === 'null') return true;
    return false;
  },

  /**
   * Reads and inspects an uploaded Excel file using SheetJS (XLSX).
   * Performs format inspection ONLY.
   * 
   * @param {File} file - Browser File object (.xlsx / .xls)
   * @returns {Promise<Object>} Inspection metadata (sheets, headers, detectedRegColumn, rowCount)
   */
  async inspectExcelFile(file) {
    return new Promise((resolve, reject) => {
      if (typeof window.XLSX === 'undefined') {
        reject(new Error('SheetJS library is not loaded.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });

          const sheetNames = workbook.SheetNames || [];
          if (sheetNames.length === 0) {
            resolve({
              valid: false,
              message: 'No sheets found in workbook',
              sheets: [],
              headers: [],
              detectedRegColumn: null,
              rowCount: 0
            });
            return;
          }

          const firstSheetName = sheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Read sheet as an array of arrays to inspect header row
          const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const headerRow = rawRows.length > 0 ? rawRows[0] : [];

          // Clean headers (filter empty values)
          const headers = headerRow
            .map(h => (h !== undefined && h !== null ? String(h).trim() : ''))
            .filter(h => h.length > 0);

          // Find registration column flexibly
          let detectedRegColumn = null;
          for (const header of headers) {
            if (this.isRegistrationColumn(header)) {
              detectedRegColumn = header;
              break;
            }
          }

          const dataRowCount = Math.max(0, rawRows.length - 1);

          resolve({
            valid: true,
            sheets: sheetNames,
            activeSheet: firstSheetName,
            headers: headers,
            detectedRegColumn: detectedRegColumn,
            rowCount: dataRowCount
          });
        } catch (err) {
          reject(new Error(`Failed to parse Excel file: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading failed.'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Parses the real uploaded Excel file rows for marks processing.
   * Extracts rows and builds dynamic column key-value objects.
   * 
   * @param {File} file - Selected Excel file (.xlsx, .xls)
   * @returns {Promise<Object>} { valid, sheetName, regColumn, headers, rows }
   */
  async parseExcelRows(file) {
    return new Promise((resolve, reject) => {
      if (typeof window.XLSX === 'undefined') {
        reject(new Error('SheetJS library is not loaded.'));
        return;
      }

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array' });

          const sheetNames = workbook.SheetNames || [];
          if (sheetNames.length === 0) {
            resolve({
              valid: false,
              error: 'Uploaded workbook contains no sheets.',
              rows: [],
              regColumn: null
            });
            return;
          }

          const firstSheetName = sheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Read entire sheet as array of arrays with default empty string
          const rawGrid = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (!rawGrid || rawGrid.length === 0) {
            resolve({
              valid: false,
              error: 'Uploaded Excel sheet is empty.',
              rows: [],
              regColumn: null
            });
            return;
          }

          // Headers from first row
          const headerRow = rawGrid[0].map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
          
          let regColIndex = -1;
          let regColName = null;

          for (let i = 0; i < headerRow.length; i++) {
            if (this.isRegistrationColumn(headerRow[i])) {
              regColIndex = i;
              regColName = headerRow[i];
              break;
            }
          }

          if (regColIndex === -1) {
            resolve({
              valid: false,
              error: 'No registration number column found in Excel file. Expected headers such as: RegNo, Reg_No, Register Number, etc.',
              rows: [],
              regColumn: null,
              headers: headerRow
            });
            return;
          }

          const rows = [];
          for (let r = 1; r < rawGrid.length; r++) {
            const rowArray = rawGrid[r];
            // Skip completely empty rows
            const hasAnyData = rowArray.some(cell => cell !== undefined && cell !== null && String(cell).trim().length > 0);
            if (!hasAnyData) continue;

            const rawRegVal = rowArray[regColIndex];
            const regNo = rawRegVal !== undefined && rawRegVal !== null ? String(rawRegVal).trim() : '';

            // Dynamic columns map (all other columns in row)
            const dynamicData = {};
            for (let c = 0; c < headerRow.length; c++) {
              const header = headerRow[c];
              if (!header) continue;
              if (c === regColIndex) continue; // Exclude registration column from dynamic marks body
              dynamicData[header] = rowArray[c] !== undefined && rowArray[c] !== null ? rowArray[c] : '';
            }

            rows.push({
              rowNumber: r + 1,
              regNo: regNo,
              dynamicData: dynamicData,
              rawRow: rowArray
            });
          }

          resolve({
            valid: true,
            sheetName: firstSheetName,
            regColumn: regColName,
            headers: headerRow,
            rows: rows
          });
        } catch (err) {
          reject(new Error(`Failed to parse Excel rows: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('File reading failed.'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Generates a clean, parent-friendly email body in the required format:
   * 
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
   * Rules:
   * 1. Never include S.No in any format.
   * 2. Exclude Branch, Dept, Class, Section, Mail, and non-academic metadata.
   * 3. Display Reg No separately as "Reg No : [Student Reg No]".
   * 4. Keep actual subject columns dynamic without hardcoding.
   * 5. Ignore empty, null, undefined, or NaN values.
   * 6. System-generated header and closing ("Regards,\nAIDS\nSRM MCET").
   * 
   * @param {Object} dynamicData - Key-value map of dynamic columns or rowItem
   * @param {string} [regNo] - Student registration number
   * @returns {string} Formatted email body
   */
  formatDynamicMessage(dynamicData, regNo = '') {
    if (!dynamicData && !regNo) return '';

    let data = dynamicData || {};
    let studentRegNo = regNo;

    // Support passing rowItem directly: { dynamicData, regNo }
    if (dynamicData && typeof dynamicData === 'object' && dynamicData.dynamicData && typeof dynamicData.dynamicData === 'object') {
      if (!studentRegNo && dynamicData.regNo) {
        studentRegNo = dynamicData.regNo;
      }
      data = dynamicData.dynamicData;
    }

    // If studentRegNo was not passed separately, detect from data keys
    if (!studentRegNo && typeof data === 'object') {
      for (const [key, val] of Object.entries(data)) {
        if (this.isRegistrationColumn(key) && val !== undefined && val !== null && String(val).trim().length > 0) {
          studentRegNo = String(val).trim();
          break;
        }
      }
    }

    const academicLines = [];

    if (data && typeof data === 'object') {
      for (const [colName, colVal] of Object.entries(data)) {
        // Rules 1-4: NEVER include S.No, Branch, Dept, Class, Section, Mail, or non-academic metadata
        if (this.isMetadataColumn(colName)) {
          continue;
        }

        // Rule 8: Ignore empty, null, undefined, or NaN values
        if (this.isEmptyOrInvalidValue(colVal)) {
          continue;
        }

        const cleanColName = String(colName).trim();
        const cleanColVal = String(colVal).trim();
        academicLines.push(`${cleanColName} : ${cleanColVal}`);
      }
    }

    const cleanRegNo = studentRegNo !== undefined && studentRegNo !== null ? String(studentRegNo).trim() : '';

    const lines = [
      'Dear Parents,',
      '',
      "Your ward's academic performance is given below:",
      '',
      `Reg No : ${cleanRegNo}`
    ];

    if (academicLines.length > 0) {
      lines.push('');
      lines.push(...academicLines);
    }

    lines.push('');
    lines.push('Regards,');
    lines.push('AIDS');
    lines.push('SRM MCET');

    return lines.join('\n');
  }
};
