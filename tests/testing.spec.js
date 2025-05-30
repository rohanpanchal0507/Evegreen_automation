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
    
    // Wait for the sidebar to be visible and enabled
    const sidebarSelector = '.sidebar, [class*="sidebar"], nav';
    await page.waitForSelector(sidebarSelector, { state: 'visible', timeout: 30000 });
    
    // Scroll the sidebar into view and hover
    const sidebar = await page.$(sidebarSelector);
    if (sidebar) {
      await sidebar.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await page.waitForTimeout(500);
      await sidebar.hover();
      await page.waitForTimeout(500);
      await storeStep('SIDEBAR-HOVER', 'Hovered over sidebar', 'Passed');
    } else {
      await storeStep('SIDEBAR-NOT-FOUND', 'Sidebar not found for hover', 'Failed');
      throw new Error('Sidebar not found');
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

    // Tax Section Flow - To be looped twice for two configurations
    await storeStep(49, 'Scrolling to Tax section (once before loop)');
    const taxSection = await page.waitForSelector('text=Tax', { timeout: 5000 });
    if (taxSection) {
        await taxSection.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(2000); 
    }

    const usedTaxSchemeTexts = [];
    const usedChargesOnTexts = [];

    for (let taxConfigIteration = 0; taxConfigIteration < 2; taxConfigIteration++) {
        const currentTaxIteration = taxConfigIteration + 1;
        await storeStep(`TAX-CONFIG-ITERATION-${currentTaxIteration}-START`, `Starting Tax Configuration ${currentTaxIteration}`);

        // 1. Select Tax Scheme using keyboard navigation
        await storeStep(50, `Iteration ${currentTaxIteration}: Selecting Tax Scheme using keyboard`);
        await page.keyboard.press('Tab'); // Focus to Tax Scheme input area
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown'); // Open dropdown
        await page.waitForTimeout(1000);

        await page.waitForSelector('div[role="presentation"] [role="option"]', { timeout: 5000, state: 'visible' });
        const allTaxSchemeOptionsElements = await page.$$('div[role="presentation"] [role="option"]');
        let selectedTaxSchemeText = '';

        if (allTaxSchemeOptionsElements.length > 0) {
            const optionDetails = [];
            for (let i = 0; i < allTaxSchemeOptionsElements.length; i++) {
                optionDetails.push({ text: (await allTaxSchemeOptionsElements[i].textContent()).trim(), originalIndex: i });
            }
            const uniqueTaxSchemes = optionDetails.filter(opt => !usedTaxSchemeTexts.includes(opt.text));
            let schemesToChooseFrom = uniqueTaxSchemes.length > 0 ? uniqueTaxSchemes : optionDetails;
            if (uniqueTaxSchemes.length === 0 && optionDetails.length > 0) {
                await storeStep(`TAX-SCHEME-STRATEGY-${currentTaxIteration}`, `Iteration ${currentTaxIteration}: No unique Tax Schemes left, selecting from all.`, 'Passed');
            }

            if (schemesToChooseFrom.length > 0) {
                const choice = schemesToChooseFrom[Math.floor(Math.random() * schemesToChooseFrom.length)];
                selectedTaxSchemeText = choice.text;
                // Navigate to the chosen option by its original index
                // (ArrowDown to open is already done)
                for (let k = 0; k < choice.originalIndex; k++) {
                    await page.keyboard.press('ArrowDown');
                    await page.waitForTimeout(100); 
                }
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
                usedTaxSchemeTexts.push(selectedTaxSchemeText);
                await storeStep(51, `Iteration ${currentTaxIteration}: Selected Tax Scheme`, 'Passed', {
                    'Field': 'Tax Scheme',
                    'Selected Value': selectedTaxSchemeText
                });
            } else {
                 await storeStep(`TAX-SCHEME-ERROR-${currentTaxIteration}`, `Iteration ${currentTaxIteration}: No Tax Scheme options found.`, 'Failed');
                 throw new Error(`Iteration ${currentTaxIteration}: No Tax Scheme options found.`);
            }
        } else {
            await storeStep(`TAX-SCHEME-ERROR-${currentTaxIteration}`, `Iteration ${currentTaxIteration}: Tax Scheme dropdown empty.`, 'Failed');
            throw new Error(`Iteration ${currentTaxIteration}: Tax Scheme dropdown empty.`);
        }
        await page.waitForTimeout(1000);

        // 2. Select Charges On using keyboard navigation
        await storeStep(52, `Iteration ${currentTaxIteration}: Selecting Charges On using keyboard`);
        await page.keyboard.press('Tab'); // Focus to Charges On input area
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown'); // Open dropdown
        await page.waitForTimeout(1000);

        await page.waitForSelector('[role="listbox"] [role="option"]', { timeout: 5000, state: 'visible' });
        const allChargesOnOptionsElements = await page.$$('[role="listbox"] [role="option"]');
        let selectedChargesOnText = '';

        if (allChargesOnOptionsElements.length > 0) {
            const optionDetails = [];
            for (let i = 0; i < allChargesOnOptionsElements.length; i++) {
                optionDetails.push({ text: (await allChargesOnOptionsElements[i].textContent()).trim(), originalIndex: i });
            }
            const uniqueChargesOn = optionDetails.filter(opt => !usedChargesOnTexts.includes(opt.text));
            let chargesToChooseFrom = uniqueChargesOn.length > 0 ? uniqueChargesOn : optionDetails;
            if (uniqueChargesOn.length === 0 && optionDetails.length > 0) {
                await storeStep(`CHARGES-ON-STRATEGY-${currentTaxIteration}`, `Iteration ${currentTaxIteration}: No unique Charges On left, selecting from all.`, 'Passed');
            }

            if (chargesToChooseFrom.length > 0) {
                const choice = chargesToChooseFrom[Math.floor(Math.random() * chargesToChooseFrom.length)];
                selectedChargesOnText = choice.text;
                // Navigate to the chosen option by its original index
                for (let k = 0; k < choice.originalIndex; k++) {
                    await page.keyboard.press('ArrowDown');
                    await page.waitForTimeout(100);
                }
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
                usedChargesOnTexts.push(selectedChargesOnText);
                await storeStep(53, `Iteration ${currentTaxIteration}: Selected Charges On`, 'Passed', {
                    'Field': 'Charges On',
                    'Selected Value': selectedChargesOnText
                });
            } else {
                 await storeStep(`CHARGES-ON-ERROR-${currentTaxIteration}`, `Iteration ${currentTaxIteration}: No Charges On options found.`, 'Failed');
                 throw new Error(`Iteration ${currentTaxIteration}: No Charges On options found.`);
            }
        } else {
            await storeStep(`CHARGES-ON-ERROR-${currentTaxIteration}`, `Iteration ${currentTaxIteration}: Charges On dropdown empty.`, 'Failed');
            throw new Error(`Iteration ${currentTaxIteration}: Charges On dropdown empty.`);
        }
        await page.waitForTimeout(1000);

        // 3. Enter Charges Amount (500-4000)
        const chargesAmount = Math.floor(Math.random() * (4000 - 500 + 1)) + 500;
        await storeStep(54, `Iteration ${currentTaxIteration}: Entering Charges Amount`, 'Passed', {
            'Field': 'Charges Amount',
            'Entered Value': chargesAmount
        });
        await page.keyboard.press('Tab'); // Focus on Charges Amount input
        await page.waitForTimeout(1000);
        await page.keyboard.type(chargesAmount.toString());
        await page.waitForTimeout(1000);

        // 4. Enter Value Percentage (5-15)
        const taxValuePercentage = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
        await storeStep(55, `Iteration ${currentTaxIteration}: Entering Value Percentage`, 'Passed', {
            'Field': 'Value Percentage',
            'Entered Value': `${taxValuePercentage}%`
        });
        await page.keyboard.press('Tab'); // Focus on Value percentage input
        await page.waitForTimeout(1000);
        await page.keyboard.type(taxValuePercentage.toString());
        await page.waitForTimeout(1000);

        // 5. Click Add Button
        await storeStep(56, `Iteration ${currentTaxIteration}: Clicking Add button for Tax section`, 'Passed', {
            'Summary': `Added Tax with: Scheme: ${selectedTaxSchemeText}, Charges On: ${selectedChargesOnText}, Amount: ${chargesAmount}, Value: ${taxValuePercentage}%`
        });
        await page.keyboard.press('Tab'); // Focus on Add button
        await page.waitForTimeout(1000);
        await page.keyboard.press('Enter'); // Click Add button
        await page.waitForTimeout(2000); // Wait for add action to complete
        await storeStep(`TAX-CONFIG-ITERATION-${currentTaxIteration}-END`, `Finished Tax Configuration ${currentTaxIteration}`);
    }
 
    await page.waitForTimeout(2000);
  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    await page.waitForTimeout(4000);
    await page.close();
    throw error;
  }
}); 
