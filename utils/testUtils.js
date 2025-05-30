const XLSX = require('xlsx');
const { faker } = require('@faker-js/faker');
const path = require('path');
const fs = require('fs');

// Function to get report filename based on test file
const getReportFileName = (testFile) => {
  const fileName = path.basename(testFile, '.spec.js');
  const reportDir = path.join(process.cwd(), 'ExecutionReport');
  
  // Create ExecutionReport directory if it doesn't exist
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  return path.join(reportDir, `${fileName}_Report.xlsx`);
};

// Format duration in a human-readable way
const formatDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

// Format details object into a readable string
const formatDetails = (details) => {
  if (!details) return '';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

// Track start time for each step and test
let stepStartTime = null;
let testStartTime = null;
let currentReportFile = null;

// Function to store step in Excel with improved formatting
const storeStep = async (stepNumber, description, status = 'Passed', details = '') => {
  try {
    if (!currentReportFile) {
      throw new Error('Report file not initialized. Call initializeExcelFile first.');
    }

    let workbook;
    try { 
      workbook = XLSX.readFile(currentReportFile); 
    } catch { 
      workbook = XLSX.utils.book_new(); 
    }

    // Create or get the Steps worksheet
    const stepsWorksheet = workbook.Sheets['Test Steps'] || XLSX.utils.aoa_to_sheet([
      ['Step Number', 'Description', 'Status', 'Details', 'Start Time', 'Duration']
    ]);

    // Create or get the Summary worksheet
    const summaryWorksheet = workbook.Sheets['Test Summary'] || XLSX.utils.aoa_to_sheet([
      ['Metric', 'Value'],
      ['Test Name', path.basename(currentReportFile, '_Report.xlsx')],
      ['Start Time', new Date().toLocaleString('en-IN')],
      ['Total Steps', '0'],
      ['Passed Steps', '0'],
      ['Failed Steps', '0'],
      ['Total Duration', '0'],
      ['Average Step Duration', '0']
    ]);

    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    });

    const duration = stepStartTime ? formatDuration(now - stepStartTime) : '0ms';
    stepStartTime = now;

    // Add step to Steps worksheet
    XLSX.utils.sheet_add_aoa(stepsWorksheet, [[
      stepNumber,
      description,
      status,
      formatDetails(details),
      timestamp,
      duration
    ]], { origin: -1 });

    // Update summary statistics
    const totalSteps = XLSX.utils.sheet_to_json(stepsWorksheet).length;
    const passedSteps = XLSX.utils.sheet_to_json(stepsWorksheet).filter(row => row.Status === 'Passed').length;
    const failedSteps = XLSX.utils.sheet_to_json(stepsWorksheet).filter(row => row.Status === 'Failed').length;
    const totalDuration = testStartTime ? formatDuration(now - testStartTime) : '0ms';
    const avgDuration = testStartTime ? formatDuration((now - testStartTime) / totalSteps) : '0ms';

    // Update summary worksheet
    XLSX.utils.sheet_add_aoa(summaryWorksheet, [
      ['Total Steps', totalSteps],
      ['Passed Steps', passedSteps],
      ['Failed Steps', failedSteps],
      ['Total Duration', totalDuration],
      ['Average Step Duration', avgDuration]
    ], { origin: 'A4' });

    // Set column widths for better readability
    const stepsColWidths = [
      { wch: 15 },  // Step Number
      { wch: 50 },  // Description
      { wch: 10 },  // Status
      { wch: 40 },  // Details
      { wch: 20 },  // Start Time
      { wch: 15 }   // Duration
    ];

    const summaryColWidths = [
      { wch: 20 },  // Metric
      { wch: 40 }   // Value
    ];

    stepsWorksheet['!cols'] = stepsColWidths;
    summaryWorksheet['!cols'] = summaryColWidths;

    // Add or update worksheets in workbook
    if (!workbook.Sheets['Test Steps']) {
      XLSX.utils.book_append_sheet(workbook, stepsWorksheet, 'Test Steps');
    } else {
      workbook.Sheets['Test Steps'] = stepsWorksheet;
    }

    if (!workbook.Sheets['Test Summary']) {
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Test Summary');
    } else {
      workbook.Sheets['Test Summary'] = summaryWorksheet;
    }

    // Write the workbook with retry mechanism
    for (let retries = 3; retries > 0; retries--) {
      try {
        XLSX.writeFile(workbook, currentReportFile);
        break;
      } catch (e) {
        if (retries === 1) throw e;
        await new Promise(r => setTimeout(r, 500));
      }
    }
  } catch (e) {
    console.error('Error in storeStep:', e.message);
  }
};

// Function to initialize Excel file with improved formatting
const initializeExcelFile = (testFile) => {
  currentReportFile = getReportFileName(testFile);
  testStartTime = new Date();
  stepStartTime = testStartTime;

  const workbook = XLSX.utils.book_new();

  // Initialize Steps worksheet
  const stepsWorksheet = XLSX.utils.aoa_to_sheet([
    ['Step Number', 'Description', 'Status', 'Details', 'Start Time', 'Duration']
  ]);

  // Initialize Summary worksheet
  const summaryWorksheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Test Name', path.basename(testFile, '.spec.js')],
    ['Start Time', testStartTime.toLocaleString('en-IN')],
    ['Total Steps', '0'],
    ['Passed Steps', '0'],
    ['Failed Steps', '0'],
    ['Total Duration', '0'],
    ['Average Step Duration', '0']
  ]);

  // Set column widths
  stepsWorksheet['!cols'] = [
    { wch: 15 },  // Step Number
    { wch: 50 },  // Description
    { wch: 10 },  // Status
    { wch: 40 },  // Details
    { wch: 20 },  // Start Time
    { wch: 15 }   // Duration
  ];

  summaryWorksheet['!cols'] = [
    { wch: 20 },  // Metric
    { wch: 40 }   // Value
  ];

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Test Summary');
  XLSX.utils.book_append_sheet(workbook, stepsWorksheet, 'Test Steps');

  // Write the workbook
  XLSX.writeFile(workbook, currentReportFile);
};

// Generate fake data for testing
const generateFakeData = (credentials) => {
  return {
    customerEnquiryNo: `ENQ${faker.random.numeric(5)}`,
    deliveryDetailsContent: faker.lorem.paragraph(),
    remarksContent: faker.lorem.sentences(2)
  };
};

module.exports = {
  storeStep,
  initializeExcelFile,
  generateFakeData
}; 