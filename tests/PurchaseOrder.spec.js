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
    // 7. Do mouse hover on Sidebar
    await storeStep(8, 'Moving mouse over the sidebar menu');
    await page.waitForSelector('.sidebar, [class*="sidebar"], nav', { timeout: 30000 });
    await page.hover('.sidebar, [class*="sidebar"], nav');

    // 8. Click on Purchase Order menu from sidebar
    await storeStep(9, 'Clicking on Purchase Order menu item');
    await page.waitForSelector('span:has-text("Purchase Order")', { timeout: 30000 });
    await page.click('span:has-text("Purchase Order")');

    // 9. Wait till Purchase Order page loads
    await storeStep(10, 'Waiting for Purchase Order page to load');
    await page.waitForLoadState('networkidle');

    // 10. Click on Generate PO button
    await storeStep(11, 'Clicking on Generate PO button');
    await page.waitForSelector('button:has-text("Generate PO")', { timeout: 30000 });
    await page.click('button:has-text("Generate PO")');

    // Wait for the form to be visible and fully loaded
    await storeStep(12, 'Waiting for form to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.MuiFormControl-root', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // --- Basic Information Form ---
    // 1. Check and Set Currency
    await storeStep(13, 'Checking and setting Currency');
    const currencyField = await page.waitForSelector('div[class*="makeStyles-selectWithReset"]', { timeout: 30000 });
    const currencyValue = await currencyField.textContent();
    
    if (!currencyValue.includes('INR')) {
      await storeStep(14, 'Setting Currency to INR', 'Passed', {
        'Currency': 'INR'
      });
      await currencyField.click();
      await page.waitForSelector('[role="option"]', { timeout: 30000 });
      await page.click('[role="option"]:has-text("INR")');
      await page.waitForTimeout(2000);
    } else {
      await storeStep(14, 'Currency is already set to INR', 'Passed', {
        'Currency': 'INR'
      });
    }

    // 2. Select Assignee
    await storeStep(15, 'Selecting Assignee');
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
      await storeStep(16, 'Selected Assignee: Green', 'Passed', {
        'Assignee': 'Green'
      });
    } else {
      await storeStep(16, 'Could not find Green assignee option', 'Failed');
      throw new Error('Green assignee option not found');
    }

    await page.waitForTimeout(2000);

  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    await page.waitForTimeout(4000);
    await page.close();
    throw error;
  }
}); 