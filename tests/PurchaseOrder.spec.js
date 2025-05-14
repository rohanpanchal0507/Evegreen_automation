const { test } = require('@playwright/test');
const credentials = require('../config/config');
const { storeStep, initializeExcelFile, generateFakeData } = require('../utils/testUtils');
const path = require('path');
const fs = require('fs');

test.use({
  viewport: null,
  launchOptions: {
    args: ['--start-maximized'],
    headless: false
  }
});

test('Complete Purchase Order Flow with Login', async ({ page, context, browser }) => {
  try {
    test.setTimeout(180000);

    // Initialize Excel file with the test file name
    initializeExcelFile(__filename);

    // Store browser instance globally
    global.browser = browser;

    // Create auth directory if it doesn't exist
    const authDir = path.join(process.cwd(), 'playwright', '.auth');
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // --- Login Flow ---
    // 1. Browser is already maximized due to launch options
    await storeStep(1, 'Opening Chrome browser in full screen');

    // 2. Navigate to the admin portal
    await storeStep(2, `Navigating to ${credentials.login.url}`);
    await page.goto(credentials.login.url);
    
    // Wait for the login form to be visible
    await page.waitForSelector('form', { timeout: 30000 });

    // 3. Fill the username field
    await storeStep(3, `Entering username: ${credentials.login.username}`, 'Passed', {
      'Username': credentials.login.username
    });
    await page.fill('input[type="email"], input[type="text"]', credentials.login.username);

    // 4. Fill the password field
    await storeStep(4, 'Entering password', 'Passed', {
      'Password': '********' // Masked for security
    });
    await page.fill('input[type="password"]', credentials.login.password);

    // 5. Click on the SIGN IN button
    await storeStep(5, 'Clicking on SIGN IN button');
    const signInSelector = 'button[type="submit"], button:has-text("SIGN IN")';
    await page.waitForSelector(signInSelector, { timeout: 30000, state: 'visible' });
    const signInButton = await page.$(signInSelector);
    if (signInButton) {
      await signInButton.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await signInButton.focus();
      await page.waitForTimeout(500);
      await signInButton.click();
      await storeStep('SIGNIN-CLICK', 'Clicked SIGN IN button', 'Passed');
    } else {
      await storeStep('SIGNIN-BUTTON-NOT-FOUND', 'Could not find SIGN IN button', 'Failed');
      throw new Error('SIGN IN button not found');
    }

    // 6. Wait until the page loads
    await storeStep(6, 'Waiting for page to load completely');
    await page.waitForLoadState('networkidle');

    // Store authentication state
    await storeStep(7, 'Storing authentication state');
    await context.storageState({ path: path.join(authDir, 'user.json') });

    // --- Purchase Order Flow ---
    // 7. Wait for and interact with Sidebar
    await storeStep(8, 'Waiting for sidebar menu to be ready');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for the sidebar to be visible and stable
    const sidebarSelector = '.sidebar, [class*="sidebar"], nav';
    await page.waitForSelector(sidebarSelector, { 
      state: 'visible',
      timeout: 30000 
    });

    // Move mouse to sidebar with retry mechanism
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await storeStep(9, `Attempting to hover over sidebar (Attempt ${retryCount + 1})`);
        const sidebar = await page.$(sidebarSelector);
        if (sidebar) {
          const box = await sidebar.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.waitForTimeout(500); // Reduced wait time
            break;
          }
        }
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) {
          await storeStep('SIDEBAR-HOVER-FAILED', 'Failed to hover over sidebar after multiple attempts', 'Failed');
          throw new Error('Failed to hover over sidebar');
        }
        await page.waitForTimeout(500);
      }
    }

    // 8. Click on Purchase Order menu from sidebar
    await storeStep(10, 'Clicking on Purchase Order menu item');
    await page.waitForSelector('span:has-text("Purchase Order")', { 
      state: 'visible',
      timeout: 30000 
    });
    await page.click('span:has-text("Purchase Order")');

    // 9. Wait till Purchase Order page loads
    await storeStep(11, 'Waiting for Purchase Order page to load');
    await page.waitForLoadState('networkidle');

    // 10. Click on Generate PO button
    await storeStep(12, 'Clicking on Generate PO button');
    await page.waitForSelector('button:has-text("Generate PO")', { timeout: 30000 });
    await page.click('button:has-text("Generate PO")');

    // Wait for the form to be visible and fully loaded
    await storeStep(13, 'Waiting for form to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.MuiFormControl-root', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // --- Basic Information Form ---
    // 1. Check and Set Currency
    await storeStep(14, 'Checking and setting Currency');
    const currencyField = await page.waitForSelector('div[class*="makeStyles-selectWithReset"]', { timeout: 30000 });
    const currencyValue = await currencyField.textContent();
    
    if (!currencyValue.includes('INR')) {
      await storeStep(15, 'Setting Currency to INR', 'Passed', {
        'Currency': 'INR'
      });
      await currencyField.click();
      await page.waitForSelector('[role="option"]', { timeout: 30000 });
      await page.click('[role="option"]:has-text("INR")');
      await page.waitForTimeout(2000);
    } else {
      await storeStep(15, 'Currency is already set to INR', 'Passed', {
        'Currency': 'INR'
      });
    }

    // 2. Select Assignee
    await storeStep(16, 'Selecting Assignee');
    const assigneeField = await page.waitForSelector('div[class*="MuiAutocomplete-root"]', { timeout: 30000 });
    await assigneeField.click();
    await page.waitForTimeout(1000);
    
    // Type "Green" in the assignee field
    await page.keyboard.type('Green');
    await page.waitForTimeout(2000);
    
    // Select the option containing "Green"
    const assigneeOption = await page.waitForSelector('[role="option"]:has-text("Green")', { timeout: 30000 });
    if (assigneeOption) {
      await assigneeOption.click();
      await storeStep(17, 'Selected Assignee: Green', 'Passed', {
        'Assignee': 'Green'
      });
    } else {
      await storeStep(17, 'Could not find Green assignee option', 'Failed');
      throw new Error('Green assignee option not found');
    }

    await page.waitForTimeout(2000);

    // 3. Select Supplier (from first 6 options)
    await storeStep(18, 'Selecting Supplier');
    // Find the supplier field by looking for the input field with specific attributes
    const supplierField = await page.waitForSelector('div[class*="MuiAutocomplete-root"] input[aria-autocomplete="list"]', { timeout: 30000 });
    await supplierField.click();
    await page.waitForTimeout(1000);
    
    // Get all supplier options and select from first 6
    const supplierOptions = await page.$$('[role="option"]');
    if (supplierOptions.length > 0) {
      const maxOptions = Math.min(6, supplierOptions.length);
      const randomIndex = Math.floor(Math.random() * maxOptions);
      const selectedSupplier = await supplierOptions[randomIndex].textContent();
      await supplierOptions[randomIndex].click();
      await storeStep(19, 'Selected Supplier', 'Passed', {
        'Selected Supplier': selectedSupplier.trim()
      });
    } else {
      await storeStep(19, 'No supplier options found', 'Failed');
      throw new Error('No supplier options found');
    }
    await page.waitForTimeout(2000);

    // 4. Select Supplier Address
    await storeStep(20, 'Selecting Supplier Address');
    // Find the supplier address field by looking for the select element after the supplier field
    const supplierAddressField = await page.waitForSelector('div[class*="makeStyles-selectWithReset"]:has(legend:has-text("Address"))', { timeout: 30000 });
    await supplierAddressField.click();
    await page.waitForSelector('[role="option"]', { timeout: 30000 });
    const addressOptions = await page.$$('[role="option"]');
    if (addressOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * addressOptions.length);
      const selectedAddress = await addressOptions[randomIndex].textContent();
      await addressOptions[randomIndex].click();
      await storeStep(21, 'Selected Supplier Address', 'Passed', {
        'Selected Address': selectedAddress.trim()
      });
    } else {
      await storeStep(21, 'No supplier address options found', 'Failed');
      throw new Error('No supplier address options found');
    }
    await page.waitForTimeout(2000);

    // 5. Enter Enquiry Reference Number
    const enquiryRefNo = `ENQ${Math.floor(Math.random() * 10000)}`;
    await storeStep(22, 'Entering Enquiry Reference Number', 'Passed', {
      'Enquiry Reference Number': enquiryRefNo
    });
    await page.fill('input[name="enquiry_ref_no"]', enquiryRefNo);
    await page.waitForTimeout(2000);

    // 6. Set Enquiry Reference Date (5 days before today)
    await storeStep(23, 'Setting Enquiry Reference Date');
    const enquiryDateField = await page.waitForSelector('input[aria-label="Choose date"]', { timeout: 30000 });
    await enquiryDateField.click();
    await page.waitForTimeout(1000);

    // Calculate date 5 days before today
    const getDateFiveDaysAgo = () => {
      const date = new Date();
      date.setDate(date.getDate() - 5);
      return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
        monthName: date.toLocaleString('en-US', { month: 'long' })
      };
    };
    const fiveDaysAgo = getDateFiveDaysAgo();

    // Wait for the date picker to be visible
    await page.waitForSelector('[role="dialog"]', { timeout: 30000 });
    
    // Try multiple selector patterns to find the date cell
    let dateCell = await page.$(`[aria-label*="${fiveDaysAgo.day} ${fiveDaysAgo.monthName} ${fiveDaysAgo.year}"]`);
    if (!dateCell) {
      dateCell = await page.$(`button[tabindex="0"]:has-text("${fiveDaysAgo.day}")`);
    }
    if (!dateCell) {
      dateCell = await page.$(`[role="gridcell"]:has-text("${fiveDaysAgo.day}")`);
    }

    if (dateCell) {
      await dateCell.click();
      await page.waitForTimeout(1000);
      
      // Look for OK button with multiple possible selectors
      const okButton = await page.$('button:has-text("OK"), button[aria-label="OK"]');
      if (okButton) {
        await okButton.click();
        await storeStep(24, 'Set Enquiry Reference Date', 'Passed', {
          'Selected Date': `${fiveDaysAgo.day}-${fiveDaysAgo.month}-${fiveDaysAgo.year}`
        });
      } else {
        // If OK button not found, try clicking outside to close the picker
        await page.mouse.click(0, 0);
        await storeStep(24, 'Set Enquiry Reference Date (without OK button)', 'Passed', {
          'Selected Date': `${fiveDaysAgo.day}-${fiveDaysAgo.month}-${fiveDaysAgo.year}`
        });
      }
    } else {
      await storeStep(24, 'Date cell not found in date picker', 'Failed', {
        'Attempted Date': `${fiveDaysAgo.day}-${fiveDaysAgo.month}-${fiveDaysAgo.year}`
      });
      throw new Error('Date cell not found in date picker');
    }
    await page.waitForTimeout(2000);

    // 7. Select Buyer Info Address
    await storeStep(25, 'Selecting Buyer Info Address');
    // Find the Buyer Info section by its heading, then the Address dropdown within it
    const buyerInfoSection = await page.waitForSelector('text=Buyer Info');
    // Get the closest parent box for the Buyer Info section
    const buyerInfoBox = await buyerInfoSection.evaluateHandle(node => {
      let el = node;
      while (el && !el.querySelector('label') && el.parentElement) {
        el = el.parentElement;
      }
      return el;
    });
    // Now find the Address dropdown inside this box
    const buyerAddressDropdown = await buyerInfoBox.$('label:has-text("Address") ~ div [role="combobox"], label:has-text("Address") + div [role="combobox"], div[role="combobox"]');
    await buyerAddressDropdown.click();
    await page.waitForSelector('[role="option"]', { timeout: 30000 });
    const buyerAddressOptions = await page.$$('[role="option"]');
    if (buyerAddressOptions.length > 0) {
      const randomIndex = Math.floor(Math.random() * buyerAddressOptions.length);
      const selectedBuyerAddress = await buyerAddressOptions[randomIndex].textContent();
      await buyerAddressOptions[randomIndex].click();
      await storeStep(26, 'Selected Buyer Info Address', 'Passed', {
        'Selected Buyer Address': selectedBuyerAddress.trim()
      });
    } else {
      await storeStep(26, 'No buyer address options found', 'Failed');
      throw new Error('No buyer address options found');
    }
    await page.waitForTimeout(2000);

  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    await page.waitForTimeout(4000);
    await page.close();
    throw error;
  }
}); 