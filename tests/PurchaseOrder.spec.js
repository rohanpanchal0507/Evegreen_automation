const { test } = require('@playwright/test');
const credentials = require('../config/config');
const { storeStep, initializeExcelFile } = require('../utils/testUtils');
const path = require('path');
const fs = require('fs');

test.use({
  viewport: null,
  launchOptions: {
    args: ['--start-maximized'],
    headless: false
  }
});

test('Purchase Order Creation Flow', async ({ page, context, browser }) => {
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
    // 8. Do mouse hover on Sidebar
    await storeStep(8, 'Moving mouse over the sidebar menu');
    await page.waitForSelector('.sidebar, [class*="sidebar"], nav', { timeout: 30000 });
    await page.hover('.sidebar, [class*="sidebar"], nav');

    // 9. Click on Purchase Order menu from sidebar
    await storeStep(9, 'Clicking on Purchase Order menu item');
    await page.waitForSelector('span:has-text("Purchase Order")', { timeout: 30000 });
    await page.click('span:has-text("Purchase Order")');

    // 10. Wait till Purchase Order page loads
    await storeStep(10, 'Waiting for Purchase Order page to load');
    await page.waitForLoadState('networkidle');

    // 11. Click on Generate PO button
    await storeStep(11, 'Clicking on Generate PO button');
    await page.waitForSelector('button:has-text("Generate PO")', { timeout: 30000 });
    await page.click('button:has-text("Generate PO")');

    // 12. Wait for the Basic Information form to load
    await storeStep(12, 'Waiting for Basic Information form to load');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('form', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // 13. Fill Basic Information form
    await storeStep(13, 'Starting to fill Basic Information form');

    // 1. Assignee Selection: Choose "Green" from the dropdown options by searching for it and selecting it.
    await storeStep(14, 'Selecting Assignee: Green');
    
    // First, click on the Assignee dropdown field to open it
    const assigneeDropdown = await page.$('label:has-text("Assignee") ~ div .MuiAutocomplete-inputRoot');
    if (!assigneeDropdown) {
      throw new Error('Assignee dropdown field not found');
    }
    await assigneeDropdown.click();
    await page.waitForTimeout(2000); // Increased wait time for dropdown to open

    // Type "Green" in the search field
    const assigneeInput = await page.$('.MuiAutocomplete-inputRoot input');
    if (!assigneeInput) {
      throw new Error('Assignee input field not found');
    }
    await assigneeInput.fill('Green');
    await page.waitForTimeout(2000); // Increased wait time for search results

    // Wait for the dropdown list to appear
    await page.waitForSelector('div[role="listbox"]', { 
      timeout: 10000,
      state: 'visible'
    });

    // Wait for any option to be visible first
    await page.waitForSelector('div[role="option"]', {
      timeout: 10000,
      state: 'visible'
    });

    // Now look specifically for Green
    const greenOption = await page.waitForSelector('div[role="option"]:has-text("Green")', { 
      timeout: 10000,
      state: 'visible'
    });
    
    if (!greenOption) {
      throw new Error('Green option not found in dropdown list');
    }

    // Use keyboard navigation to select the option
    await page.keyboard.press('ArrowDown');  // Move to the first option
    await page.waitForTimeout(1000);        // Increased wait time
    await page.keyboard.press('Enter');      // Select the option
    await page.waitForTimeout(2000);        // Increased wait time for selection to complete

    // 2. Supplier Selection: Select from first six options
    await storeStep(15, 'Selecting Supplier (first 6 options)');
    const supplierInput = await page.$('label:has-text("Supplier") ~ div .MuiAutocomplete-inputRoot input');
    if (supplierInput) {
      await supplierInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const supplierOptions = await page.$$('div[role="option"]');
      if (supplierOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(6, supplierOptions.length));
        await supplierOptions[randomIndex].click();
        await page.waitForTimeout(1000);
      }
    }

    // 3. Address Selection: Select the first address
    await storeStep(16, 'Selecting first Supplier Address');
    const addressInput = await page.$('label:has-text("Address") ~ div .MuiAutocomplete-inputRoot input');
    if (addressInput) {
      await addressInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const addressOptions = await page.$$('div[role="option"]');
      if (addressOptions.length > 0) {
        await addressOptions[0].click();
        await page.waitForTimeout(1000);
      }
    }

    // 4. Enquiry Reference Number: Enter random data
    await storeStep(17, 'Entering random Enquiry Reference Number');
    await page.fill('input[placeholder*="Enq. Ref. No"]', Math.floor(Math.random() * 1000000).toString());

    // 5. Enquiry Reference Date: Select a date 5 days prior to today
    await storeStep(18, 'Selecting Enquiry Reference Date (5 days prior)');
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const yyyy = fiveDaysAgo.getFullYear();
    const mm = (fiveDaysAgo.getMonth() + 1).toString().padStart(2, '0');
    const dd = fiveDaysAgo.getDate().toString().padStart(2, '0');
    await page.click('input[placeholder*="Enq. Ref Date"]');
    await page.fill('input[placeholder*="Enq. Ref Date"]', `${dd}-${mm}-${yyyy}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // 6. Buyer Info Address: Choose any option from dropdown
    await storeStep(19, 'Selecting Buyer Info Address');
    const buyerInput = await page.$('label:has-text("Buyer") ~ div .MuiAutocomplete-inputRoot input');
    if (buyerInput) {
      await buyerInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const buyerAddressOptions = await page.$$('div[role="option"]');
      if (buyerAddressOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * buyerAddressOptions.length);
        await buyerAddressOptions[randomIndex].click();
        await page.waitForTimeout(1000);
      }
    }

    // 7. Charges Selection: Select "NA" radio for all types
    await storeStep(20, 'Selecting NA for all charges');
    for (const label of ['Testing Charges', 'Delivery Charges', 'Packing', 'Freight', 'Local Delivery']) {
      const naRadio = await page.$(`label:has-text("${label}") ~ div input[type="radio"][value="NA"]`);
      if (naRadio) {
        await naRadio.check();
        await page.waitForTimeout(500);
      }
    }

    // 8. Price Basis: Choose any option from dropdown
    await storeStep(21, 'Selecting Price Basis');
    const priceBasisInput = await page.$('label:has-text("Price Basis") ~ div .MuiAutocomplete-inputRoot input');
    if (priceBasisInput) {
      await priceBasisInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const priceBasisOptions = await page.$$('div[role="option"]');
      if (priceBasisOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * priceBasisOptions.length);
        await priceBasisOptions[randomIndex].click();
        await page.waitForTimeout(1000);
      }
    }

    // 9. Value and Terms: Enter 100 in Value (%), 5 in Days, select any Terms & Conditions, click ADD
    await storeStep(22, 'Filling Value, Days, Terms & Conditions and clicking ADD');
    await page.fill('input[placeholder*="Value"]', '100');
    await page.fill('input[placeholder*="Days"]', '5');
    
    const termsInput = await page.$('label:has-text("Terms & Conditions") ~ div .MuiAutocomplete-inputRoot input');
    if (termsInput) {
      await termsInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const termsOptions = await page.$$('div[role="option"]');
      if (termsOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * termsOptions.length);
        await termsOptions[randomIndex].click();
        await page.waitForTimeout(1000);
      }
    }
    await page.click('button:has-text("ADD")');
    await page.waitForTimeout(1000);

    // 10. Tax Scheme Selection: Select any option from dropdown
    await storeStep(23, 'Selecting Tax Scheme');
    const taxSchemeInput = await page.$('label:has-text("Tax Scheme") ~ div .MuiAutocomplete-inputRoot input');
    if (taxSchemeInput) {
      await taxSchemeInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const taxSchemeOptions = await page.$$('div[role="option"]');
      if (taxSchemeOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * taxSchemeOptions.length);
        await taxSchemeOptions[randomIndex].click();
        await page.waitForTimeout(1000);
      }
    }

    // 11. Charges Entry: Choose any Charges, random amount 500-5000, Value(%) 1-100, click ADD
    await storeStep(24, 'Filling Tax Charges and clicking ADD');
    const chargesInput = await page.$('label:has-text("Charges On") ~ div .MuiAutocomplete-inputRoot input');
    if (chargesInput) {
      await chargesInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const chargesOnOptions = await page.$$('div[role="option"]');
      if (chargesOnOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * chargesOnOptions.length);
        await chargesOnOptions[randomIndex].click();
        await page.waitForTimeout(1000);
      }
    }
    await page.fill('input[placeholder*="Charge Amount"]', (Math.floor(Math.random() * 4501) + 500).toString());
    await page.fill('input[placeholder*="Value"]', (Math.floor(Math.random() * 100) + 1).toString());
    await page.click('button:has-text("ADD")');
    await page.waitForTimeout(1000);

    // 12. Type Selection: Select "NA" in Type dropdown
    await storeStep(25, 'Selecting NA in Type dropdown');
    const typeInput = await page.$('label:has-text("Type") ~ div .MuiAutocomplete-inputRoot input');
    if (typeInput) {
      await typeInput.click();
      await page.waitForTimeout(1000);
      await page.waitForSelector('div[role="option"]');
      const typeOptions = await page.$$('div[role="option"]');
      for (const opt of typeOptions) {
        const text = await opt.textContent();
        if (text && text.trim() === 'NA') {
          await opt.click();
          await page.waitForTimeout(1000);
          break;
        }
      }
    }

    // 13. Remarks: Enter random text
    await storeStep(26, 'Entering Remarks');
    await page.fill('textarea[placeholder*="Enter Text"]', 'Automated test remarks: ' + Math.random().toString(36).substring(2, 10));

    // Final wait
    await storeStep(27, 'Waiting for final confirmation');
    await page.waitForTimeout(5000);

  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    throw error;
  }
}); 