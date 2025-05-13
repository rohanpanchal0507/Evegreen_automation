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

// Function to format duration
const formatDuration = ms => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msRem = ms % 1000;
  return `${h ? `${h}h ` : ''}${m ? `${m}m ` : ''}${s ? `${s}s ` : ''}${msRem ? `${msRem}ms` : ''}`.trim() || '0ms';
};

// Function to format details in a readable way
const formatDetails = details => !details ? '' : typeof details === 'string' ? details : 
  Object.entries(details).map(([k, v]) => `${k}: ${v}`).join('\n');

// Track start time for each step
let stepStartTime = null;
let currentReportFile = null;

// Function to store step in Excel
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

    const worksheet = workbook.Sheets['Steps'] || XLSX.utils.aoa_to_sheet([['Step Number', 'Description', 'Status', 'Details', 'Timestamp', 'Duration']]);
    
    const headerStyle = { font: { bold: true } };
    ['Step Number', 'Description', 'Status', 'Details', 'Timestamp', 'Duration'].forEach((h, i) => {
      worksheet[XLSX.utils.encode_cell({ r: 0, c: i })].s = headerStyle;
    });

    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true, timeZone: 'Asia/Kolkata'
    }).replace(',', '').replace(/\//g, '-');

    const duration = stepStartTime ? formatDuration(now - stepStartTime) : '0ms';
    stepStartTime = now;

    XLSX.utils.sheet_add_aoa(worksheet, [[stepNumber, description, status, formatDetails(details), timestamp, duration]], { origin: -1 });
    
    if (!workbook.Sheets['Steps']) XLSX.utils.book_append_sheet(workbook, worksheet, 'Steps');
    
    await new Promise(r => setTimeout(r, 100));
    
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

// Function to initialize Excel file
const initializeExcelFile = (testFile) => {
  currentReportFile = getReportFileName(testFile);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([['Step Number', 'Description', 'Status', 'Details', 'Timestamp', 'Duration']]);
  
  const headerStyle = { font: { bold: true } };
  ['Step Number', 'Description', 'Status', 'Details', 'Timestamp', 'Duration'].forEach((h, i) => {
    worksheet[XLSX.utils.encode_cell({ r: 0, c: i })].s = headerStyle;
  });
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Steps');
  XLSX.writeFile(workbook, currentReportFile);
  stepStartTime = new Date();
};

// Function to generate fake data
const generateFakeData = credentials => {
  const pipeTypes = ['Stainless Steel', 'Carbon Steel', 'Galvanized', 'PVC', 'Copper'];
  const pipeSizes = ['1/2"', '3/4"', '1"', '1.5"', '2"', '3"', '4"', '6"'];
  const pipeStandards = ['ASTM A53', 'ASTM A106', 'API 5L', 'ASME B36.10M', 'EN 10255'];
  const pipeGrades = ['GR.B', 'GR.A', 'X42', 'X52', 'X60', '304', '316'];
  const surfaceFinishes = ['Black', 'Galvanized', 'Bare', 'Coated', 'Polished'];

  const deliveryDetailsContent = `Delivery of ${faker.helpers.arrayElement(pipeTypes)} pipes, 
  Size: ${faker.helpers.arrayElement(pipeSizes)}, 
  Quantity: ${faker.number.int({ min: 100, max: 1000 })} meters, 
  Delivery Date: ${faker.date.future({ days: 30 }).toLocaleDateString()}, 
  Special Instructions: ${faker.helpers.arrayElement([
    'Handle with care - fragile material',
    'Store in dry conditions',
    'Protect from direct sunlight',
    'Stack vertically only',
    'Use protective caps on both ends'
  ])}`;

  const remarksContent = `Technical Specifications:
1. Material: ${faker.helpers.arrayElement(pipeTypes)} Pipes
2. Standard: ${faker.helpers.arrayElement(pipeStandards)}
3. Grade: ${faker.helpers.arrayElement(pipeGrades)}
4. Surface Finish: ${faker.helpers.arrayElement(surfaceFinishes)}
5. Testing Requirements: ${faker.helpers.arrayElement([
    'Hydrostatic testing required',
    'Visual inspection and dimensional check',
    'Full NDT testing required',
    'Mill test certificate required',
    'Third-party inspection required'
  ])}
6. Packaging: ${faker.helpers.arrayElement([
    'Bundled with steel straps',
    'Individual pipe protection',
    'Wooden crates',
    'Plastic end caps',
    'Waterproof wrapping'
  ])}
7. Additional Notes: ${faker.helpers.arrayElement([
    'All pipes must be new and unused',
    'Material certificates must be provided',
    'Traceability required for each pipe',
    'Special handling instructions apply',
    'Custom marking required'
  ])}`;

  return {
    customerEnquiryNo: faker.number.int({ 
      min: credentials.testData.customerEnquiryNo.min, 
      max: credentials.testData.customerEnquiryNo.max 
    }).toString(),
    deliveryDetailsContent,
    remarksContent
  };
};

module.exports = {
  storeStep,
  initializeExcelFile,
  generateFakeData
}; 