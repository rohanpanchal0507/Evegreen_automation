const { test, expect } = require('@playwright/test');
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

    // --- Basic Information Form ---
    // 1. Select Currency (90% chance INR, 10% random other)
    await storeStep(14, 'Selecting currency (90% chance INR, 10% random other)');
    const currencyField = await page.waitForSelector('div[class*="makeStyles-selectWithReset"]', { timeout: 30000 });
    await currencyField.click();
    
    await page.waitForSelector('[role="option"]', { timeout: 30000 });
    const currencyOptionsElements = await page.$$('[role="option"]');
    let actualSelectedCurrencyText = ''; 
    let selectedElementToClick;

    if (currencyOptionsElements.length === 0) {
        await storeStep('CURRENCY-ERROR', 'No currency options found in the dropdown.', 'Failed');
        throw new Error('No currency options found in the dropdown.');
    }

    const optionTexts = [];
    for (const option of currencyOptionsElements) {
        optionTexts.push((await option.textContent()).trim());
    }
    const inrIndex = optionTexts.findIndex(text => text === 'INR');

    if (Math.random() < 0.9 && inrIndex !== -1) { // 90% chance to select INR, if INR exists
        selectedElementToClick = currencyOptionsElements[inrIndex];
        actualSelectedCurrencyText = 'INR';
        await storeStep('CURRENCY-CHOICE', 'Selected INR (90% probability path)', 'Passed', {'Chosen Currency': 'INR'});
    } else { // 10% chance to select a random non-INR currency
        const nonInrOptions = currencyOptionsElements.filter((option, index) => index !== inrIndex);
        if (nonInrOptions.length > 0) {
            const randomIndex = Math.floor(Math.random() * nonInrOptions.length);
            selectedElementToClick = nonInrOptions[randomIndex];
            actualSelectedCurrencyText = (await selectedElementToClick.textContent()).trim();
            await storeStep('CURRENCY-CHOICE', `Selected random non-INR: ${actualSelectedCurrencyText} (10% probability path)`, 'Passed', {'Chosen Currency': actualSelectedCurrencyText});
        } else if (inrIndex !== -1) { // Fallback to INR if it's the only/remaining option
            selectedElementToClick = currencyOptionsElements[inrIndex];
            actualSelectedCurrencyText = 'INR';
            await storeStep('CURRENCY-CHOICE', 'Selected INR (fallback in 10% path as only/primary option)', 'Passed', {'Chosen Currency': 'INR'});
        } else { // Fallback to the first option if INR not found and no non-INR options (should ideally not happen if list not empty)
            selectedElementToClick = currencyOptionsElements[0];
            actualSelectedCurrencyText = (await selectedElementToClick.textContent()).trim();
            await storeStep('CURRENCY-CHOICE', `Selected first available: ${actualSelectedCurrencyText} (fallback as INR/non-INR specific selection failed)`, 'Passed', {'Chosen Currency': actualSelectedCurrencyText});
        }
    }
    
    if (selectedElementToClick) {
        await selectedElementToClick.click();
    } else {
        // This case should ideally be prevented by the currencyOptionsElements.length check earlier
        await storeStep('CURRENCY-ERROR', 'Could not determine a currency element to click.', 'Failed');
        throw new Error('Could not determine a currency element to click or no options available.');
    }
    await page.waitForTimeout(1000); // Wait for UI to update after click

    // If selected currency is not INR, enter exchange rate
    if (actualSelectedCurrencyText !== 'INR') {
      await storeStep(15, `Setting exchange rate for ${actualSelectedCurrencyText}`, 'Passed', {
        'Currency': actualSelectedCurrencyText
      });
      
      const exchangeRate = (Math.random() * (95 - 10) + 10).toFixed(2);
      const exchangeRateInput = await page.waitForSelector('input[name="exchange_rate"]', { timeout: 30000 });
      await exchangeRateInput.fill(exchangeRate.toString());
      
      await storeStep('EXCHANGE-RATE-SET', `Set exchange rate to ${exchangeRate} for ${actualSelectedCurrencyText}`, 'Passed', {
        'Exchange Rate': exchangeRate
      });
    } else { // actualSelectedCurrencyText IS 'INR'
      await storeStep(15, 'Selected currency is INR. Verifying exchange rate field.', 'Passed', {
        'Currency': 'INR'
      });
      const exchangeRateInput = page.locator('input[name="exchange_rate"]');
      await expect(exchangeRateInput).toBeDisabled({ timeout: 5000 });
      await expect(exchangeRateInput).toHaveValue("0", { timeout: 1000 });
      await storeStep('INR-VERIFICATION', 'Exchange rate field for INR is disabled and value is 0.', 'Passed');
    }

    await page.waitForTimeout(1000);


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
    // Find the Supplier Information section by its heading, then the Address dropdown within it
    const supplierInfoSection = await page.waitForSelector('text=Supplier Information');
    // Get the closest parent box for the Supplier Information section
    const supplierInfoBox = await supplierInfoSection.evaluateHandle(node => {
      let el = node;
      while (el && !el.querySelector('label') && el.parentElement) {
        el = el.parentElement;
      }
      return el;
    });
    // Now find the Address dropdown inside this box
    const supplierAddressDropdown = await supplierInfoBox.$('label:has-text("Address") ~ div [role="combobox"], label:has-text("Address") + div [role="combobox"], div[role="combobox"]');
    await supplierAddressDropdown.click();
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

    // Handle CHA Charges and Duty Charges
    await storeStep(27, 'Handling CHA Charges and Duty Charges');
    
    try {
        // Find and fill CHA Charges input
        const chaChargesInput = await page.waitForSelector('input[name="cha_charges_percentage"]', { timeout: 5000 });
        if (chaChargesInput) {
            const chaChargesValue = Math.floor(Math.random() * 20) + 1; // Random value between 1-20
            await chaChargesInput.fill(chaChargesValue.toString());
            await storeStep(28, `Entered CHA Charges value: ${chaChargesValue}%`, 'Passed');
            await page.waitForTimeout(1000);

            // Find and fill Duty Charges input
            const dutyChargesInput = await page.waitForSelector('input[name="duty_charges_percentage"]', { timeout: 5000 });
            if (dutyChargesInput) {
                const dutyChargesValue = Math.floor(Math.random() * 20) + 1; // Random value between 1-20
                await dutyChargesInput.fill(dutyChargesValue.toString());
                await storeStep(29, `Entered Duty Charges value: ${dutyChargesValue}%`, 'Passed');
                await page.waitForTimeout(1000);
            }
        }
    } catch (error) {
        await storeStep('INFO', 'CHA and Duty charges fields not found, skipping to Charges section', 'Passed');
    }

    // Scroll down to Charges section
    const chargesSection = await page.waitForSelector('text=Charges');
    await chargesSection.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await page.waitForTimeout(1000);

    // Function to handle charge selection
    async function handleChargeSelection(chargeName, stepNumber) {
      await storeStep(stepNumber, `Handling ${chargeName} radio button selection`);
      
      // Find the charge section by its label
      const chargeLabel = await page.waitForSelector(`label:has-text("${chargeName}")`);
      const chargeSection = await chargeLabel.evaluateHandle(node => {
        let el = node;
        while (el && !el.querySelector('input[type="radio"]') && el.parentElement) {
          el = el.parentElement;
        }
        return el;
      });

      // Get all radio options
      const radioOptions = await chargeSection.$$('input[type="radio"]');
      if (radioOptions.length === 0) {
        throw new Error(`No radio options found in ${chargeName} section`);
      }

      // Randomly select one option
      const randomIndex = Math.floor(Math.random() * radioOptions.length);
      const selectedOption = radioOptions[randomIndex];
      const optionValue = await selectedOption.getAttribute('value');
      
      // Click the selected radio button
      await selectedOption.click();
      await page.waitForTimeout(1000);

      try {
        if (optionValue === 'NA') {
          await storeStep(stepNumber + 1, `Selected NA option for ${chargeName} - skipping to next step`, 'Passed');
        } else if (optionValue === 'Over All') {
          // Press Tab to move focus to Type dropdown
          await page.keyboard.press('Tab');
          await page.waitForTimeout(1000);

          // Press Down Arrow to open the dropdown
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(1000);

          // Wait for the dropdown menu to be visible
          const dropdownMenu = await page.waitForSelector('div[role="presentation"]', { timeout: 5000 });
          if (!dropdownMenu) {
            throw new Error('Dropdown menu not found');
          }

          // Get all type options within the dropdown menu
          const typeOptions = await dropdownMenu.$$('[role="option"]');
          if (typeOptions.length === 0) {
            throw new Error('No type options found in dropdown');
          }

          // Select a random option using keyboard
          const randomTypeIndex = Math.floor(Math.random() * typeOptions.length);
          for (let i = 0; i < randomTypeIndex; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(500);
          }
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);

          // Get the text of the selected option
          const selectedTypeText = await typeOptions[randomTypeIndex].textContent();

          // Press Enter to select the option
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);

          // Log the selected Type option
          await storeStep(`${stepNumber}-TYPE`, `Selected Type for ${chargeName}`, 'Passed', {
              'Field': `${chargeName} Type`,
              'Selected Value': selectedTypeText.trim()
          });

          // Press Tab twice to ensure focus moves to Rate input
          await page.keyboard.press('Tab');
          await page.waitForTimeout(500);
          await page.keyboard.press('Tab');
          await page.waitForTimeout(1000);

          // Generate random rate
          const randomRate = Math.floor(Math.random() * 100) + 1;

          // Type the rate value directly using keyboard
          await page.keyboard.type(randomRate.toString());
          await page.waitForTimeout(1000);

          // Log the entered Rate
          await storeStep(`${stepNumber}-RATE`, `Entered Rate for ${chargeName}`, 'Passed', {
              'Field': `${chargeName} Rate`,
              'Entered Value': `${randomRate}%`
          });

          await storeStep(stepNumber + 1, `Completed ${chargeName} section`, 'Passed', {
              'Section': chargeName,
              'Option': 'Over All',
              'Type': selectedTypeText.trim(),
              'Rate': `${randomRate}%`
          });
        } else if (optionValue === 'Item Wise') {
          await storeStep(stepNumber + 1, `Selected Item Wise option for ${chargeName} - skipping to next step`, 'Passed');
        }
      } catch (error) {
        await storeStep('ERROR', `Failed to handle ${chargeName} options: ${error.message}`, 'Failed');
        throw error;
      }

      await page.waitForTimeout(1000);
    }

    // Handle TPI
    await handleChargeSelection('TPI', 27);

    // Handle Testing
    await handleChargeSelection('Testing', 29);

    // Handle Packing
    await handleChargeSelection('Packing', 31);

    // Handle Freight
    await handleChargeSelection('Freight', 33);

    // Handle Local Delivery
    await handleChargeSelection('Local Delivery', 35);

    // --- Payment and Terms Flow ---

    // Scroll to Payment Terms section
    await storeStep(36, 'Scrolling to Payment Terms section');
    const paymentTermsSection = await page.waitForSelector('text=Payment Terms', { timeout: 5000 });
    if (paymentTermsSection) {
        await paymentTermsSection.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(2000);
    }

    // --- Payment and Terms Flow ---

    // 1. Select Price Basis Dropdown (once before the loop)
    await storeStep(38, 'Selecting Price Basis option (once)');
    let priceBasisDropdown;
    try {
        priceBasisDropdown = await page.waitForSelector('div[role="combobox"]:has-text("Price Basis")', { timeout: 3000 });
    } catch (error) {
        try {
            priceBasisDropdown = await page.waitForSelector('label:text("Price Basis") + div [role="combobox"]', { timeout: 3000 });
        } catch (error) {
            priceBasisDropdown = await page.waitForSelector('.MuiSelect-select:has-text("Price Basis"), [role="combobox"]:near(:text("Price Basis"))', { timeout: 3000 });
        }
    }
    if (!priceBasisDropdown) {
        throw new Error('Price Basis dropdown not found after multiple attempts');
    }
    await priceBasisDropdown.click();
    await page.waitForTimeout(1000);

    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const priceBasisOptions = await page.$$('[role="option"]');
    let selectedPriceBasisText = ''; // Renamed to avoid conflict if var was defined inside loop before
    if (priceBasisOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * priceBasisOptions.length);
        selectedPriceBasisText = (await priceBasisOptions[randomIndex].textContent()).trim();
        await priceBasisOptions[randomIndex].click();
        await storeStep(39, 'Selected Price Basis option (once)', 'Passed', {
            'Field': 'Price Basis',
            'Selected Value': selectedPriceBasisText
        });
    }
    await page.waitForTimeout(1000);
    
    // Loop for Value, Days, Terms & Conditions, Add button - Repeated 3 times
    // Generate three random parts that sum to 100
    let p1 = Math.floor(Math.random() * 98) + 1; // 1 to 98
    let p2 = Math.floor(Math.random() * (99 - p1)) + 1; // 1 to (99-p1)
    let p3 = 100 - p1 - p2;
    const paymentValues = [p1, p2, p3];
    await storeStep('RANDOM-PAYMENT-SPLIT', `Generated payment split: ${paymentValues.join(', ')}`, 'Passed');

    const usedTermsTextsThisRun = []; // Keep track of selected T&C texts in this run

    for (let i = 0; i < 3; i++) {
        const currentPaymentValue = paymentValues[i];
        const iteration = i + 1;
     
        await storeStep(37, `Iteration ${iteration}: Starting Payment and Terms segment`);
     
        // 2. Enter Value (currentPaymentValue)
        await storeStep(40, `Iteration ${iteration}: Entering Value percentage`, 'Passed', {
            'Field': 'Value Percentage',
            'Entered Value': `${currentPaymentValue}%`
        });
        // Ensure the input field is interactable, might need to re-focus or ensure visibility if form state changes
        const valueInput = await page.waitForSelector('input[name="payment.value"]', { timeout: 5000, state: 'visible' });
        await valueInput.fill(currentPaymentValue.toString());
        await page.waitForTimeout(1000);
     
        // 3. Enter Days (random between 1-10)
        const daysValue = Math.floor(Math.random() * 10) + 1;
        await storeStep(42, `Iteration ${iteration}: Entering Days value`, 'Passed', {
            'Field': 'Days',
            'Entered Value': daysValue
        });
        const daysInput = await page.waitForSelector('input[name="payment.days"]', { timeout: 5000, state: 'visible' });
        await daysInput.fill(daysValue.toString());
        await page.waitForTimeout(1000);
     
        await daysInput.press('Tab'); // Tab from days to hopefully land on or before T&C
        await page.waitForTimeout(1000);
     
        // 4. Select Terms & Conditions using keyboard navigation (attempt unique selection)
        await storeStep(44, `Iteration ${iteration}: Selecting Terms & Conditions option (attempting unique)`);
        
        // Ensure the dropdown is ready to be opened/interacted with
        await page.keyboard.press('ArrowDown'); 
        await page.waitForTimeout(1000);
        await page.waitForSelector('[role="option"]', { timeout: 5000, state: 'visible' });
        const allTermsOptionsElements = await page.$$('[role="option"]');
        let chosenTermsElement;
        let selectedTermsText = '';

        if (allTermsOptionsElements.length > 0) {
            const optionTextsAndElements = [];
            for (const el of allTermsOptionsElements) {
                optionTextsAndElements.push({ text: (await el.textContent()).trim(), element: el, originalIndex: optionTextsAndElements.length });
            }

            const availableUniqueOptions = optionTextsAndElements.filter(opt => !usedTermsTextsThisRun.includes(opt.text));
            
            let targetOptionsToChooseFrom;
            if (availableUniqueOptions.length > 0) {
                targetOptionsToChooseFrom = availableUniqueOptions;
                await storeStep('TERMS-SELECTION-STRATEGY', `Iteration ${iteration}: Selecting from ${availableUniqueOptions.length} unique T&C options.`, 'Passed');
            } else {
                targetOptionsToChooseFrom = optionTextsAndElements; // Fallback to all options if no unique ones left
                await storeStep('TERMS-SELECTION-STRATEGY', `Iteration ${iteration}: No unique T&C options left, selecting from all ${optionTextsAndElements.length} options.`, 'Passed');
            }

            if (targetOptionsToChooseFrom.length > 0) {
                const randomChoiceIndexInFilteredList = Math.floor(Math.random() * targetOptionsToChooseFrom.length);
                const chosenOption = targetOptionsToChooseFrom[randomChoiceIndexInFilteredList];
                chosenTermsElement = chosenOption.element;
                selectedTermsText = chosenOption.text;
                const originalIndexToNavigate = chosenOption.originalIndex;

                // Navigate to the chosen option by its original index in the full list
                for (let j = 0; j < originalIndexToNavigate; j++) {
                   
                }
                for (let k = 0; k < originalIndexToNavigate; k++) {
                    await page.keyboard.press('ArrowDown');
                    await page.waitForTimeout(100); // Brief pause for each navigation step
                }
                await page.keyboard.press('Enter');
                usedTermsTextsThisRun.push(selectedTermsText);
                await storeStep(45, `Iteration ${iteration}: Selected Terms & Conditions: ${selectedTermsText}`, 'Passed', {
                    'Field': 'Terms & Conditions',
                    'Selected Value': selectedTermsText
                });
            } else {
                 await storeStep('TERMS-SELECTION-ERROR', `Iteration ${iteration}: No T&C options found to select.`, 'Failed');
            }
        } else {
            await storeStep('TERMS-SELECTION-ERROR', `Iteration ${iteration}: T&C dropdown was empty or options not found.`, 'Failed');
        }
        await page.waitForTimeout(1000);
     
        // 5. Click Add button
        await storeStep(46, `Iteration ${iteration}: Clicking Add button`, 'Passed', {
            'Summary': `Added Payment Terms with: Price Basis: ${selectedPriceBasisText}, Value: ${currentPaymentValue}%, Days: ${daysValue}`
        });
        const addButton = await page.waitForSelector('button:has-text("Add")', { timeout: 5000 });
        await addButton.click();
     
        // 6. Wait for 5 seconds after adding payment terms
        await storeStep(48, `Iteration ${iteration}: Waiting for 5 seconds after adding payment terms`, 'Passed', {
            'Action': `Completed adding payment terms segment ${iteration}`,
            'Status': 'Successful'
        });
        await page.waitForTimeout(5000); // Wait for table to update or any other UI changes
    }

    // Tax Section Flow
    // Scroll to Tax section
    await storeStep(49, 'Scrolling to Tax section');
    const taxSection = await page.waitForSelector('text=Tax', { timeout: 5000 });
    if (taxSection) {
        await taxSection.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(2000); // Wait for scroll to complete
    }

    // 1. Select Tax Scheme using keyboard navigation
    await storeStep(50, 'Selecting Tax Scheme using keyboard');
    
    // Press Tab to focus on Tax Scheme input
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Press Down Arrow to open dropdown
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);

    // Wait for dropdown options and select one randomly
    await page.waitForSelector('div[role="presentation"] [role="option"]', { timeout: 5000 });
    const taxSchemeOptions = await page.$$('div[role="presentation"] [role="option"]');
    let selectedTaxScheme = '';
    if (taxSchemeOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * taxSchemeOptions.length);
        
        // Navigate to the random option using Arrow Down
        for (let i = 0; i < randomIndex; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(500);
        }
        
        // Get the text of the selected option before pressing Enter
        selectedTaxScheme = await taxSchemeOptions[randomIndex].textContent();
        
        // Press Enter to select the option
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        await storeStep(51, 'Selected Tax Scheme', 'Passed', {
            'Field': 'Tax Scheme',
            'Selected Value': selectedTaxScheme.trim()
        });
    }
    await page.waitForTimeout(1000);

    // 2. Select Charges On using keyboard navigation
    await storeStep(52, 'Selecting Charges On using keyboard');
    
    // Press Tab to focus on Charges On dropdown
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Press Down Arrow to open dropdown
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);

    // Wait for dropdown options and select one randomly
    await page.waitForSelector('[role="listbox"] [role="option"]', { timeout: 5000 });
    const chargesOnOptions = await page.$$('[role="listbox"] [role="option"]');
    let selectedChargesOn = '';
    if (chargesOnOptions.length > 0) {
        const randomIndex = Math.floor(Math.random() * chargesOnOptions.length);
        
        // Navigate to the random option using Arrow Down
        for (let i = 0; i < randomIndex; i++) {
            await page.keyboard.press('ArrowDown');
            await page.waitForTimeout(500);
        }
        
        // Get the text of the selected option before pressing Enter
        selectedChargesOn = await chargesOnOptions[randomIndex].textContent();
        
        // Press Enter to select the option
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        await storeStep(53, 'Selected Charges On', 'Passed', {
            'Field': 'Charges On',
            'Selected Value': selectedChargesOn.trim()
        });
    }
    await page.waitForTimeout(1000);

    // 3. Enter Charges Amount (500-4000)
    const chargesAmount = Math.floor(Math.random() * (4000 - 500 + 1)) + 500;
    await storeStep(54, 'Entering Charges Amount', 'Passed', {
        'Field': 'Charges Amount',
        'Entered Value': chargesAmount
    });
    
    // Press Tab to focus on Charges Amount input
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    
    // Enter Charges Amount
    await page.keyboard.type(chargesAmount.toString());
    await page.waitForTimeout(1000);

    // 4. Enter Value Percentage (5-15)
    const taxValuePercentage = Math.floor(Math.random() * (15 - 5 + 1)) + 5;
    await storeStep(55, 'Entering Value Percentage', 'Passed', {
        'Field': 'Value Percentage',
        'Entered Value': `${taxValuePercentage}%`
    });
    
    // Press Tab to focus on Value percentage input
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    
    // Enter Value percentage
    await page.keyboard.type(taxValuePercentage.toString());
    await page.waitForTimeout(1000);

    // 5. Click Add Button
    await storeStep(56, 'Clicking Add button for Tax section', 'Passed', {
        'Summary': `Added Tax with: Scheme: ${selectedTaxScheme.trim()}, Charges On: ${selectedChargesOn.trim()}, Amount: ${chargesAmount}, Value: ${taxValuePercentage}%`
    });

    // Press Tab to focus on Add button
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);
    
    // Press Enter to click Add button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Scroll to Quantity Tolerance section
    await storeStep(57, 'Scrolling to Quantity Tolerance section');
    const quantityToleranceSection = await page.waitForSelector('text=Quantity Tolerance', { timeout: 5000 });
    if (quantityToleranceSection) {
        await quantityToleranceSection.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(2000); // Wait for scroll to complete
    }

    // Select Quantity Tolerance using keyboard navigation
    await storeStep(58, 'Selecting Quantity Tolerance using keyboard');
    
    // Press Tab to focus on Quantity Tolerance dropdown
    await page.keyboard.press('Tab');
    await page.waitForTimeout(1000);

    // Press Down Arrow to open dropdown
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(1000);

    // Wait for dropdown options
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const toleranceOptions = await page.$$('[role="option"]');
    
    // Find and select NA option
    let foundNA = false;
    for (let i = 0; i < toleranceOptions.length && !foundNA; i++) {
        const optionText = await toleranceOptions[i].textContent();
        if (optionText.trim() === 'NA') {
            // If it's not the first option, press ArrowDown to reach it
            for (let j = 0; j < i; j++) {
                await page.keyboard.press('ArrowDown');
                await page.waitForTimeout(300);
            }
            await page.keyboard.press('Enter');
            await storeStep(59, 'Selected Quantity Tolerance option', 'Passed', {
                'Field': 'Quantity Tolerance',
                'Selected Value': 'NA'
            });
            foundNA = true;
        }
    }

    if (!foundNA) {
        throw new Error('Could not find NA option in Quantity Tolerance dropdown');
    }
    await page.waitForTimeout(1000);

    // Scroll to Remarks section
    await storeStep(60, 'Scrolling to Remarks section');
    const remarksSection = await page.waitForSelector('text=Remarks', { timeout: 5000 });
    if (remarksSection) {
        await remarksSection.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        await page.waitForTimeout(2000); // Wait for scroll to complete
    }

    // Generate random remarks
    const randomRemarks = `Test Remarks ${Math.floor(Math.random() * 1000)} - Automated Entry ${new Date().toLocaleDateString()}`;
    
    // Enter remarks in the editor
    await storeStep(61, 'Entering Remarks', 'Passed', {
        'Field': 'Remarks',
        'Entered Value': randomRemarks
    });

    // Find and click the remarks editor
    const remarksEditor = await page.waitForSelector('.rdw-editor-main, [contenteditable="true"]', { timeout: 5000 });
    if (remarksEditor) {
        await remarksEditor.click();
        await page.waitForTimeout(500);
        await page.keyboard.type(randomRemarks);
        await storeStep(62, 'Entered text in Remarks editor', 'Passed');
    } else {
        throw new Error('Could not find Remarks editor');
    }
    await page.waitForTimeout(1000);

  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    await page.waitForTimeout(4000);
    await page.close();
    throw error;
  }
}); 
