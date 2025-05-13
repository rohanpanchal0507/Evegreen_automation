# Test info

- Name: Purchase Order Creation Flow
- Location: C:\Users\admin\Desktop\EVERGREEN_PROJECT\tests\PurchaseOrder.spec.js:15:1

# Error details

```
TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('div[role="listbox"]') to be visible

    at C:\Users\admin\Desktop\EVERGREEN_PROJECT\tests\PurchaseOrder.spec.js:127:16
```

# Page snapshot

```yaml
- img "Green"
- heading "Green" [level=4]
- link "Dashboard":
  - /url: /
  - img
  - text: Dashboard
- link "Dashboard Filters":
  - /url: /dashboard-filters
  - img
  - text: Dashboard Filters
- link "Customer":
  - /url: /customer
  - img
  - text: Customer
- link "Quotation":
  - /url: /quotation
  - img
  - text: Quotation
- link "Sales Order":
  - /url: /sales-order
  - img
  - text: Sales Order
- link "Delivery Order":
  - /url: /delivery-order
  - img
  - text: Delivery Order
- link "PMDC":
  - /url: /pmdc
  - img
  - text: PMDC
- link "Invoice":
  - /url: /invoice
  - img
  - text: Invoice
- link "Indent":
  - /url: /indent
  - img
  - text: Indent
- link "Supplier Enquiry":
  - /url: /supplier-enquiry
  - img
  - text: Supplier Enquiry
- link "Purchase Order":
  - /url: /purchase-order
  - img
  - text: Purchase Order
- link "MRIR":
  - /url: /mrir
  - img
  - text: MRIR
- link "Material Reject PO":
  - /url: /material-reject-po
  - img
  - text: Material Reject PO
- link "Stocks":
  - /url: /stock
  - img
  - text: Stocks
- link "Stock Transfer":
  - /url: /stock-transfer
  - img
  - text: Stock Transfer
- link "Audit Log":
  - /url: /audit
  - img
  - text: Audit Log
- link "Report":
  - /url: /report
  - img
  - text: Report
- button "Master":
  - img
  - text: Master
- button "Expand ["
- paragraph
- main:
  - img "decoration"
  - img
  - heading "Purchase Order Basic Information" [level=2]:
    - heading "Purchase Order" [level=3]
    - button "Basic Information":
      - paragraph: Basic Information
    - button:
      - paragraph
    - button:
      - paragraph
  - paragraph: Basic Details
  - text: Provide the key details for the PO, such as its number, date, and the transaction currency. Ensure accuracy, as these are critical for documentation and processing. PO Number
  - textbox "PO Number" [disabled]
  - text: PO Date
  - textbox "Choose date, selected date is May 11, 2025": 11-05-2025
  - button
  - text: Currency
  - combobox "Currency": INR
  - text: Exchange Rate
  - spinbutton "Exchange Rate" [disabled]: "0"
  - text: Assignee
  - combobox [expanded]: Green
  - button "Clear"
  - button "Close"
  - listbox:
    - option "Green"
  - paragraph: Supplier Information
  - text: Select the supplier and their address from the dropdown. Reference the enquiry number and date to link this PO to its corresponding enquiry. Supplier
  - combobox
  - button "Open"
  - text: Address
  - combobox "Currency"
  - text: Enq. Ref No.
  - textbox "Enq. Ref No."
  - text: Enq. Ref Date
  - textbox "Choose date"
  - button
  - paragraph: Buyer Info
  - text: The user must manually select the buyer and their address from the provided list. This ensures accurate mapping of buyer details for the PO. Buyer
  - combobox: EVERGREEN SEAMLESS PIPES & TUBES PVT. LTD.
  - button "Open"
  - text: Address
  - combobox "Currency"
  - paragraph: Charges
  - text: Specify any applicable testing and delivery charges. Choose whether charges apply to all items, individual items, or are not applicable.
  - paragraph: Testing Charges
  - text: TPI
  - radiogroup:
    - radio "NA"
    - text: NA
    - radio "Over All"
    - text: Over All
    - radio "Item Wise"
    - text: Item Wise
  - text: Testing
  - radiogroup:
    - radio "NA"
    - text: NA
    - radio "Over All"
    - text: Over All
    - radio "Item Wise"
    - text: Item Wise
  - paragraph: Delivery Charges
  - text: Packing
  - radiogroup:
    - radio "NA"
    - text: NA
    - radio "Over All"
    - text: Over All
    - radio "Item Wise"
    - text: Item Wise
  - text: Freight
  - radiogroup:
    - radio "NA"
    - text: NA
    - radio "Over All"
    - text: Over All
    - radio "Item Wise"
    - text: Item Wise
  - text: Local Delivery
  - radiogroup:
    - radio "NA"
    - text: NA
    - radio "Over All"
    - text: Over All
    - radio "Item Wise"
    - text: Item Wise
  - paragraph: Payment Terms
  - text: Define the terms and conditions for payment and specify the pricing basis, such as FOB, CIF, or EXW. Price Basis
  - combobox "Currency"
  - text: Value(%)*
  - spinbutton "Value(%)*"
  - text: Days*
  - spinbutton "Days*"
  - text: Terms & Conditions*
  - combobox "Currency"
  - button "Add" [disabled]
  - paragraph: "Note: Payment Terms must be 100% in total"
  - paragraph: Tax
  - text: Choose the applicable tax profile and enter the corresponding tax charges to ensure compliance with tax regulations. Tax Scheme
  - combobox
  - button "Open"
  - paragraph: Tax Charges
  - text: Charges On
  - combobox "Currency"
  - text: Charge Amount
  - spinbutton "Charge Amount"
  - text: Value(%)
  - spinbutton "Value(%)"
  - button "Add" [disabled]
  - paragraph: Quantity Tolerance
  - text: Set the tolerance type and value to allow flexibility in the delivered quantity, within acceptable limits. Type
  - combobox "Currency"
  - text: Qty Tol. Value
  - spinbutton "Qty Tol. Value" [disabled]
  - paragraph: Remarks
  - text: Include any special instructions, additional notes, or comments for the Purchase Order to provide further clarity.
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - button:
    - img
  - text: Enter Text
  - paragraph
  - button "Save to Draft"
  - button "Save & Next" [disabled]
  - paragraph: Basic Details
  - paragraph: Supplier Info
  - paragraph: Buyer Info
  - paragraph: Charges
  - paragraph: Payment Terms
  - paragraph: Tax
  - paragraph: Quantity Tolerance
  - paragraph: Remarks
- menu:
  - button "Action Menu": "0"
  - menu
- text: Feedback
```

# Test source

```ts
   27 |     if (!fs.existsSync(authDir)) {
   28 |       fs.mkdirSync(authDir, { recursive: true });
   29 |     }
   30 |
   31 |     // --- Login Flow ---
   32 |     // 1. Browser is already maximized due to launch options
   33 |     await storeStep(1, 'Opening Chrome browser in full screen');
   34 |
   35 |     // 2. Navigate to the admin portal
   36 |     await storeStep(2, `Navigating to ${credentials.login.url}`);
   37 |     await page.goto(credentials.login.url);
   38 |     
   39 |     // Wait for the login form to be visible
   40 |     await page.waitForSelector('form', { timeout: 30000 });
   41 |
   42 |     // 3. Fill the username field
   43 |     await storeStep(3, `Entering username: ${credentials.login.username}`, 'Passed', {
   44 |       'Username': credentials.login.username
   45 |     });
   46 |     await page.fill('input[type="email"], input[type="text"]', credentials.login.username);
   47 |
   48 |     // 4. Fill the password field
   49 |     await storeStep(4, 'Entering password', 'Passed', {
   50 |       'Password': '********' // Masked for security
   51 |     });
   52 |     await page.fill('input[type="password"]', credentials.login.password);
   53 |
   54 |     // 5. Click on the SIGN IN button
   55 |     await storeStep(5, 'Clicking on SIGN IN button');
   56 |     const signInSelector = 'button[type="submit"], button:has-text("SIGN IN")';
   57 |     await page.waitForSelector(signInSelector, { timeout: 30000, state: 'visible' });
   58 |     const signInButton = await page.$(signInSelector);
   59 |     if (signInButton) {
   60 |       await signInButton.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
   61 |       await signInButton.focus();
   62 |       await page.waitForTimeout(500);
   63 |       await signInButton.click();
   64 |       await storeStep('SIGNIN-CLICK', 'Clicked SIGN IN button', 'Passed');
   65 |     } else {
   66 |       await storeStep('SIGNIN-BUTTON-NOT-FOUND', 'Could not find SIGN IN button', 'Failed');
   67 |       throw new Error('SIGN IN button not found');
   68 |     }
   69 |
   70 |     // 6. Wait until the page loads
   71 |     await storeStep(6, 'Waiting for page to load completely');
   72 |     await page.waitForLoadState('networkidle');
   73 |
   74 |     // Store authentication state
   75 |     await storeStep(7, 'Storing authentication state');
   76 |     await context.storageState({ path: path.join(authDir, 'user.json') });
   77 |
   78 |     // --- Purchase Order Flow ---
   79 |     // 8. Do mouse hover on Sidebar
   80 |     await storeStep(8, 'Moving mouse over the sidebar menu');
   81 |     await page.waitForSelector('.sidebar, [class*="sidebar"], nav', { timeout: 30000 });
   82 |     await page.hover('.sidebar, [class*="sidebar"], nav');
   83 |
   84 |     // 9. Click on Purchase Order menu from sidebar
   85 |     await storeStep(9, 'Clicking on Purchase Order menu item');
   86 |     await page.waitForSelector('span:has-text("Purchase Order")', { timeout: 30000 });
   87 |     await page.click('span:has-text("Purchase Order")');
   88 |
   89 |     // 10. Wait till Purchase Order page loads
   90 |     await storeStep(10, 'Waiting for Purchase Order page to load');
   91 |     await page.waitForLoadState('networkidle');
   92 |
   93 |     // 11. Click on Generate PO button
   94 |     await storeStep(11, 'Clicking on Generate PO button');
   95 |     await page.waitForSelector('button:has-text("Generate PO")', { timeout: 30000 });
   96 |     await page.click('button:has-text("Generate PO")');
   97 |
   98 |     // 12. Wait for the Basic Information form to load
   99 |     await storeStep(12, 'Waiting for Basic Information form to load');
  100 |     await page.waitForLoadState('networkidle');
  101 |     await page.waitForSelector('form', { timeout: 30000 });
  102 |     await page.waitForTimeout(2000);
  103 |
  104 |     // 13. Fill Basic Information form
  105 |     await storeStep(13, 'Starting to fill Basic Information form');
  106 |
  107 |     // 1. Assignee Selection: Choose "Green" from the dropdown options by searching for it and selecting it.
  108 |     await storeStep(14, 'Selecting Assignee: Green');
  109 |     
  110 |     // First, click on the Assignee dropdown field to open it
  111 |     const assigneeDropdown = await page.$('label:has-text("Assignee") ~ div .MuiAutocomplete-inputRoot');
  112 |     if (!assigneeDropdown) {
  113 |       throw new Error('Assignee dropdown field not found');
  114 |     }
  115 |     await assigneeDropdown.click();
  116 |     await page.waitForTimeout(2000); // Increased wait time for dropdown to open
  117 |
  118 |     // Type "Green" in the search field
  119 |     const assigneeInput = await page.$('.MuiAutocomplete-inputRoot input');
  120 |     if (!assigneeInput) {
  121 |       throw new Error('Assignee input field not found');
  122 |     }
  123 |     await assigneeInput.fill('Green');
  124 |     await page.waitForTimeout(2000); // Increased wait time for search results
  125 |
  126 |     // Wait for the dropdown list to appear
> 127 |     await page.waitForSelector('div[role="listbox"]', { 
      |                ^ TimeoutError: page.waitForSelector: Timeout 10000ms exceeded.
  128 |       timeout: 10000,
  129 |       state: 'visible'
  130 |     });
  131 |
  132 |     // Wait for any option to be visible first
  133 |     await page.waitForSelector('div[role="option"]', {
  134 |       timeout: 10000,
  135 |       state: 'visible'
  136 |     });
  137 |
  138 |     // Now look specifically for Green
  139 |     const greenOption = await page.waitForSelector('div[role="option"]:has-text("Green")', { 
  140 |       timeout: 10000,
  141 |       state: 'visible'
  142 |     });
  143 |     
  144 |     if (!greenOption) {
  145 |       throw new Error('Green option not found in dropdown list');
  146 |     }
  147 |
  148 |     // Use keyboard navigation to select the option
  149 |     await page.keyboard.press('ArrowDown');  // Move to the first option
  150 |     await page.waitForTimeout(1000);        // Increased wait time
  151 |     await page.keyboard.press('Enter');      // Select the option
  152 |     await page.waitForTimeout(2000);        // Increased wait time for selection to complete
  153 |
  154 |     // 2. Supplier Selection: Select from first six options
  155 |     await storeStep(15, 'Selecting Supplier (first 6 options)');
  156 |     const supplierInput = await page.$('label:has-text("Supplier") ~ div .MuiAutocomplete-inputRoot input');
  157 |     if (supplierInput) {
  158 |       await supplierInput.click();
  159 |       await page.waitForTimeout(1000);
  160 |       await page.waitForSelector('div[role="option"]');
  161 |       const supplierOptions = await page.$$('div[role="option"]');
  162 |       if (supplierOptions.length > 0) {
  163 |         const randomIndex = Math.floor(Math.random() * Math.min(6, supplierOptions.length));
  164 |         await supplierOptions[randomIndex].click();
  165 |         await page.waitForTimeout(1000);
  166 |       }
  167 |     }
  168 |
  169 |     // 3. Address Selection: Select the first address
  170 |     await storeStep(16, 'Selecting first Supplier Address');
  171 |     const addressInput = await page.$('label:has-text("Address") ~ div .MuiAutocomplete-inputRoot input');
  172 |     if (addressInput) {
  173 |       await addressInput.click();
  174 |       await page.waitForTimeout(1000);
  175 |       await page.waitForSelector('div[role="option"]');
  176 |       const addressOptions = await page.$$('div[role="option"]');
  177 |       if (addressOptions.length > 0) {
  178 |         await addressOptions[0].click();
  179 |         await page.waitForTimeout(1000);
  180 |       }
  181 |     }
  182 |
  183 |     // 4. Enquiry Reference Number: Enter random data
  184 |     await storeStep(17, 'Entering random Enquiry Reference Number');
  185 |     await page.fill('input[placeholder*="Enq. Ref. No"]', Math.floor(Math.random() * 1000000).toString());
  186 |
  187 |     // 5. Enquiry Reference Date: Select a date 5 days prior to today
  188 |     await storeStep(18, 'Selecting Enquiry Reference Date (5 days prior)');
  189 |     const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  190 |     const yyyy = fiveDaysAgo.getFullYear();
  191 |     const mm = (fiveDaysAgo.getMonth() + 1).toString().padStart(2, '0');
  192 |     const dd = fiveDaysAgo.getDate().toString().padStart(2, '0');
  193 |     await page.click('input[placeholder*="Enq. Ref Date"]');
  194 |     await page.fill('input[placeholder*="Enq. Ref Date"]', `${dd}-${mm}-${yyyy}`);
  195 |     await page.keyboard.press('Enter');
  196 |     await page.waitForTimeout(1000);
  197 |
  198 |     // 6. Buyer Info Address: Choose any option from dropdown
  199 |     await storeStep(19, 'Selecting Buyer Info Address');
  200 |     const buyerInput = await page.$('label:has-text("Buyer") ~ div .MuiAutocomplete-inputRoot input');
  201 |     if (buyerInput) {
  202 |       await buyerInput.click();
  203 |       await page.waitForTimeout(1000);
  204 |       await page.waitForSelector('div[role="option"]');
  205 |       const buyerAddressOptions = await page.$$('div[role="option"]');
  206 |       if (buyerAddressOptions.length > 0) {
  207 |         const randomIndex = Math.floor(Math.random() * buyerAddressOptions.length);
  208 |         await buyerAddressOptions[randomIndex].click();
  209 |         await page.waitForTimeout(1000);
  210 |       }
  211 |     }
  212 |
  213 |     // 7. Charges Selection: Select "NA" radio for all types
  214 |     await storeStep(20, 'Selecting NA for all charges');
  215 |     for (const label of ['Testing Charges', 'Delivery Charges', 'Packing', 'Freight', 'Local Delivery']) {
  216 |       const naRadio = await page.$(`label:has-text("${label}") ~ div input[type="radio"][value="NA"]`);
  217 |       if (naRadio) {
  218 |         await naRadio.check();
  219 |         await page.waitForTimeout(500);
  220 |       }
  221 |     }
  222 |
  223 |     // 8. Price Basis: Choose any option from dropdown
  224 |     await storeStep(21, 'Selecting Price Basis');
  225 |     const priceBasisInput = await page.$('label:has-text("Price Basis") ~ div .MuiAutocomplete-inputRoot input');
  226 |     if (priceBasisInput) {
  227 |       await priceBasisInput.click();
```