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

test('Complete Quotation Flow with Login', async ({ page, context, browser }) => {
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

    // --- Quotation Flow ---
    // 7. Do mouse hover on Sidebar
    await storeStep(8, 'Moving mouse over the sidebar menu');
    await page.waitForSelector('.sidebar, [class*="sidebar"], nav', { timeout: 30000 });
    await page.hover('.sidebar, [class*="sidebar"], nav');

    // 8. Click on Quotation menu from sidebar
    await storeStep(9, 'Clicking on Quotation menu item');
    await page.waitForSelector('span:has-text("Quotation")', { timeout: 30000 });
    await page.click('span:has-text("Quotation")');

    // 9. Wait till Quotation page loads
    await storeStep(10, 'Waiting for Quotation page to load');
    await page.waitForLoadState('networkidle');

    // 10. Click on Add New button
    await storeStep(11, 'Clicking on Add New button');
    await page.waitForSelector('button:has-text("Add New")', { timeout: 30000 });
    await page.click('button:has-text("Add New")');

    // Wait for the form to be visible and fully loaded
    await storeStep(12, 'Waiting for form to load...');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.MuiFormControl-root', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // --- Date field logic for Quotation Date (readonly, DD-MM-YYYY, with date picker) ---
    try {
      // 1. Select the Quotation Date input by class or aria-label
      const quotationDateField = await page.waitForSelector('input[aria-label^="Choose date"][aria-readonly="true"]', { timeout: 30000 });
      await quotationDateField.click();
      await page.waitForTimeout(500);

      // Helper to get today's date in IST and DD-MM-YYYY
      const getISTTodayStr = () => {
        const now = new Date();
        // Convert to IST (UTC+5:30)
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
        const pad = n => n.toString().padStart(2, '0');
        return `${pad(istNow.getDate())}-${pad(istNow.getMonth() + 1)}-${istNow.getFullYear()}`;
      };
      const todayStr = getISTTodayStr();

      // 2. Read and parse the value as DD-MM-YYYY
      const quotationDateValue = await quotationDateField.inputValue();
      await storeStep('DATE-DEBUG', 'Quotation Date field value', 'Info', { 'Quotation Date Value': quotationDateValue, 'Today IST': todayStr });

      if (quotationDateValue === todayStr) {
        // 3. If the date is today, click Cancel on the date picker
        const cancelBtn = await page.$('button:has-text("Cancel")');
        if (cancelBtn) {
          await cancelBtn.click();
          await storeStep('DATE-CANCEL', 'Quotation Date is today, clicked Cancel on date picker', 'Passed');
        } else {
          await storeStep('DATE-CANCEL-FAIL', 'Cancel button not found on date picker', 'Failed');
        }
      } else {
        // 4. If not today, set to today and click OK
        const [dd, mm, yyyy] = todayStr.split('-');
        let dayCell = await page.$(`[aria-label*="${parseInt(dd)} ${new Date(yyyy, mm-1, dd).toLocaleString('en-US', { month: 'long' })} ${yyyy}"]`);
        if (!dayCell) {
          dayCell = await page.$(`button[tabindex="0"]:has-text("${parseInt(dd)}")`);
        }
        if (dayCell) {
          await dayCell.click();
          await page.waitForTimeout(300);
        } else {
          await storeStep('DATE-SET-FAIL', 'Could not find today cell in date picker', 'Failed', { 'Today': todayStr });
        }
        const okBtn = await page.$('button:has-text("OK")');
        if (okBtn) {
          await okBtn.click();
          await storeStep('DATE-OK', 'Set Quotation Date to today and clicked OK', 'Passed', { 'Set Date': todayStr });
        } else {
          await storeStep('DATE-OK-FAIL', 'OK button not found on date picker', 'Failed');
        }
      }

      // Generate fake data for Customer Enquiry No
      await storeStep(13, 'Generating fake data');
      const { customerEnquiryNo, deliveryDetailsContent, remarksContent } = generateFakeData(credentials);

      // Fill Customer Enquiry No
      await storeStep(14, 'Filling Customer Enquiry No', 'Passed', {
        'Customer Enquiry No': customerEnquiryNo
      });
      await page.waitForSelector('input[name="enquiry_no"]', { timeout: 30000 });
      await page.fill('input[name="enquiry_no"]', customerEnquiryNo);
      await page.waitForTimeout(2000);

      // Select Priority
      const priorityOptions = ['High', 'Medium', 'Low'];
      const randomPriority = priorityOptions[Math.floor(Math.random() * priorityOptions.length)];
      await storeStep(15, 'Selecting Priority', 'Passed', {
        'Selected Priority': randomPriority
      });
      const priorityField = await page.waitForSelector('#priority', { timeout: 30000 });
      await priorityField.click();
      await page.click(`[role="option"]:has-text("${randomPriority}")`);
      await page.waitForTimeout(2000);

      // Select Received Via
      try {
        const receivedViaField = await page.waitForSelector('#received_via', { timeout: 30000 });
        await receivedViaField.click();
        await page.waitForSelector('[role="option"]', { timeout: 30000 });
        const receivedViaOptions = await page.$$('[role="option"]');
        if (receivedViaOptions.length > 0) {
          const randomIndex = Math.floor(Math.random() * receivedViaOptions.length);
          const selectedOption = await receivedViaOptions[randomIndex].textContent();
          await storeStep(16, 'Selecting Received Via', 'Passed', {
            'Selected Received Via': selectedOption.trim()
          });
          await receivedViaOptions[randomIndex].click();
          await page.waitForTimeout(2000);
        }
      } catch (error) {
        await storeStep(16, 'Selecting Received Via', 'Failed', error.message);
      }

      // Check Customer and Consignee Address
      await storeStep(17, 'Checking Customer and Consignee Address fields');
      const customerAddressField = await page.$('input[name="customer_address"]');
      const consigneeAddressField = await page.$('input[name="consignee_address"]');
      
      const customerAddressValue = await customerAddressField?.inputValue();
      const consigneeAddressValue = await consigneeAddressField?.inputValue();
      
      if (!customerAddressValue && !consigneeAddressValue) {
        // Select Customer
        try {
          const customerField = await page.waitForSelector('#customer', { timeout: 30000 });
          await customerField.click();
          await page.waitForSelector('[role="option"]', { timeout: 30000 });
          const customerOptions = await page.$$('[role="option"]');
          if (customerOptions.length > 0) {
            const maxOptions = Math.min(10, customerOptions.length);
            const randomIndex = Math.floor(Math.random() * maxOptions);
            const selectedCustomer = await customerOptions[randomIndex].textContent();
            await storeStep(18, 'Selecting new Customer', 'Passed', {
              'Selected Customer': selectedCustomer.trim()
            });
            await customerOptions[randomIndex].click();
            await page.waitForTimeout(2000);
          }
        } catch (error) {
          await storeStep(18, 'Selecting new Customer', 'Failed', error.message);
        }

        await page.waitForTimeout(3000);

        // Check if addresses were auto-filled
        const updatedCustomerAddress = await page.$('input[name="customer_address"]');
        const updatedConsigneeAddress = await page.$('input[name="consignee_address"]');
        
        const updatedCustomerAddressValue = await updatedCustomerAddress?.inputValue();
        const updatedConsigneeAddressValue = await updatedConsigneeAddress?.inputValue();

        if (!updatedCustomerAddressValue || !updatedConsigneeAddressValue) {
          // Select Customer Address
          try {
            const customerAddressDropdown = await page.waitForSelector('#customer_address', { timeout: 30000 });
            await customerAddressDropdown.click();
            await page.waitForSelector('[role="option"]', { timeout: 30000 });
            const customerAddressOptions = await page.$$('[role="option"]');
            if (customerAddressOptions.length > 0) {
              const randomIndex = Math.floor(Math.random() * customerAddressOptions.length);
              const selectedCustomerAddress = await customerAddressOptions[randomIndex].textContent();
              await storeStep(19, 'Selecting Customer Address', 'Passed', {
                'Selected Customer Address': selectedCustomerAddress.trim()
              });
              await customerAddressOptions[randomIndex].click();
              await page.waitForTimeout(2000);
            }
          } catch (error) {
            await storeStep(19, 'Selecting Customer Address', 'Failed', error.message);
          }

          // Select Consignee Address
          try {
            const consigneeAddressDropdown = await page.waitForSelector('#consignee_address', { timeout: 30000 });
            await consigneeAddressDropdown.click();
            await page.waitForSelector('[role="option"]', { timeout: 30000 });
            const consigneeAddressOptions = await page.$$('[role="option"]');
            if (consigneeAddressOptions.length > 0) {
              const randomIndex = Math.floor(Math.random() * consigneeAddressOptions.length);
              const selectedConsigneeAddress = await consigneeAddressOptions[randomIndex].textContent();
              await storeStep(20, 'Selecting Consignee Address', 'Passed', {
                'Selected Consignee Address': selectedConsigneeAddress.trim()
              });
              await consigneeAddressOptions[randomIndex].click();
              await page.waitForTimeout(2000);
            }
          } catch (error) {
            await storeStep(20, 'Selecting Consignee Address', 'Failed', error.message);
          }
        } else {
          await storeStep(19, 'Customer Address', 'Passed', {
            'Customer Address': updatedCustomerAddressValue,
            'Consignee Address': updatedConsigneeAddressValue,
            'Note': 'Addresses were auto-filled after customer selection'
          });
          await storeStep(20, 'Consignee Address', 'Passed', {
            'Customer Address': updatedCustomerAddressValue,
            'Consignee Address': updatedConsigneeAddressValue,
            'Note': 'Addresses were auto-filled after customer selection'
          });
        }
      } else {
        await storeStep(18, 'Customer Selection', 'Passed', {
          'Customer Address': customerAddressValue,
          'Consignee Address': consigneeAddressValue,
          'Note': 'Customer and Consignee Address fields are already filled'
        });
      }

      // Set Delivery Type
      await storeStep(21, 'Setting Delivery Type to Manually', 'Passed', {
        'Delivery Type': 'Manually'
      });
      await page.waitForSelector('input[name="delivery_type"][value="Manually"]', { timeout: 30000 });
      await page.click('input[name="delivery_type"][value="Manually"]');
      await page.waitForTimeout(2000);

      // Fill Delivery Detail
      try {
        await storeStep(22, 'Filling Delivery Detail', 'Passed', {
          'Delivery Details': deliveryDetailsContent
        });
        const deliveryDetailField = await page.waitForSelector('input[name="delivery_detail"]', {
          timeout: 30000,
          state: 'visible'
        });

        await deliveryDetailField.evaluate(element => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await page.waitForTimeout(2000);

        await deliveryDetailField.focus();
        await page.waitForTimeout(1000);
        await deliveryDetailField.fill(deliveryDetailsContent);
        await page.waitForTimeout(2000);
      } catch (error) {
        await storeStep(22, 'Filling Delivery Detail', 'Failed', error.message);
      }

      // Fill Remarks
      try {
        await storeStep(23, 'Filling Remarks', 'Passed', {
          'Technical Remarks': remarksContent
        });
        const remarksField = await page.waitForSelector('textarea[name="technical_remark"]', {
          timeout: 30000,
          state: 'visible'
        });

        await remarksField.evaluate(element => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        await page.waitForTimeout(2000);

        await remarksField.focus();
        await page.waitForTimeout(1000);
        await remarksField.fill(remarksContent);
        await page.waitForTimeout(2000);
      } catch (error) {
        await storeStep(23, 'Filling Remarks', 'Failed', error.message);
      }

      // Final wait
      await storeStep(24, 'Waiting for final confirmation');
      await page.waitForTimeout(5000);

    } catch (error) {
      await storeStep('DATE-ERROR', 'Error handling date fields', 'Failed', { 'Error': error.message });
      throw error;
    }
    // --- End of date field logic ---

  } catch (error) {
    await storeStep('ERROR', 'Test Failed', 'Failed', error.message);
    await page.waitForTimeout(4000);
    await page.close();
    throw error;
  }
}); 