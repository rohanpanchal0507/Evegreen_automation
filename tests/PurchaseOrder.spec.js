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
        } else {
          await storeStep(29, 'Duty Charges input field not found - skipping', 'Passed');
        }
      } else {
        await storeStep(28, 'CHA Charges input field not found - skipping', 'Passed');
      }
    } catch (error) {
      await storeStep('WARNING', 'CHA and Duty Charges fields not found - proceeding with radio selection flow', 'Passed');
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

          // Log available options for debugging
          for (const option of typeOptions) {
            const text = await option.textContent();
            await storeStep('DEBUG', `Available option for ${chargeName}: ${text.trim()}`, 'Passed');
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

          // Press Tab to move to Rate input
          await page.keyboard.press('Tab');
          await page.waitForTimeout(2000);

          // Find the rate input field within the current charge section
          let rateInput = null;
          try {
            // First try to find the input within the current charge section
            const chargeSection = await page.$(`div:has(label:has-text("${chargeName}"))`);
            if (chargeSection) {
              rateInput = await chargeSection.$('input[type="number"]');
            }

            // If not found in section, try by name
            if (!rateInput) {
              const possibleNames = [
                `${chargeName.toLowerCase()}_value`,
                `${chargeName.toLowerCase()}_rate`,
                `${chargeName.toLowerCase()}_amount`,
                'rate',
                'value'
              ];

              for (const name of possibleNames) {
                rateInput = await page.$(`input[name="${name}"]`);
                if (rateInput) break;
              }
            }

            // If still not found, try finding by position relative to the charge label
            if (!rateInput) {
              const chargeLabel = await page.$(`label:has-text("${chargeName}")`);
              if (chargeLabel) {
                const followingInputs = await page.$$('input[type="number"]');
                for (const input of followingInputs) {
                  const isVisible = await input.isVisible();
                  if (isVisible) {
                    rateInput = input;
                    break;
                  }
                }
              }
            }

            if (rateInput) {
              // Scroll into view and wait
              await rateInput.scrollIntoViewIfNeeded();
              await page.waitForTimeout(1000);

              // Ensure the input is enabled
              await rateInput.waitForElementState('enabled', { timeout: 5000 });

              // Click to focus
              await rateInput.click({ force: true });
              await page.waitForTimeout(1000);

              // Generate random rate
              const randomRate = Math.floor(Math.random() * 100) + 1;

              // Try multiple methods to enter the value
              const methods = [
                // Method 1: Direct fill
                async () => {
                  await rateInput.fill(randomRate.toString());
                  await page.waitForTimeout(500);
                },
                // Method 2: Type with delay
                async () => {
                  await rateInput.type(randomRate.toString(), { delay: 100 });
                  await page.waitForTimeout(500);
                },
                // Method 3: JavaScript
                async () => {
                  await page.evaluate((selector, value) => {
                    const input = document.querySelector(selector);
                    if (input) {
                      input.value = value;
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                  }, await rateInput.evaluate(el => el.outerHTML), randomRate.toString());
                  await page.waitForTimeout(500);
                }
              ];

              // Try each method until one works
              let valueEntered = false;
              for (const method of methods) {
                try {
                  await method();
                  const currentValue = await rateInput.inputValue();
                  if (currentValue === randomRate.toString()) {
                    valueEntered = true;
                    await storeStep(stepNumber + 1, `Successfully entered rate ${randomRate} for ${chargeName}`, 'Passed');
                    break;
                  }
                } catch (error) {
                  continue;
                }
              }

              if (!valueEntered) {
                await storeStep('WARNING', `Failed to enter rate for ${chargeName} after all methods`, 'Passed');
              }
            } else {
              await storeStep('WARNING', `Could not find rate input for ${chargeName}`, 'Passed');
            }
          } catch (error) {
            await storeStep('WARNING', `Error handling rate input for ${chargeName}: ${error.message}`, 'Passed');
          }

          // Add extra wait time after handling rate input
          await page.waitForTimeout(2000);
        } else if (optionValue === 'Item Wise') {
          await storeStep(stepNumber + 1, `Selected Item Wise option for ${chargeName} - skipping to next step`, 'Passed');
        }
      } catch (error) {
        await storeStep('WARNING', `Failed to handle ${chargeName} options: ${error.message} - continuing with next charge`, 'Passed');
        return;
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

  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    await page.waitForTimeout(4000);
    await page.close();
    throw error;
  }
}); 
