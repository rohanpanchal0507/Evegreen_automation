import csv

# Define your mapping logic here
def get_automated_result(row):
    details = row['Test Case Details'].lower()
    sub_module = row['Sub Module'].lower()
    # Covered by script
    if any(x in details for x in [
        'login', 'generate po', 'basic information', 'basic details', 'stepper', 'save to draft', 'save & next', 'validation', 'field', 'remarks', 'quantity tolerance', 'tax', 'charges', 'supplier', 'buyer'
    ]) or 'basic information' in sub_module:
        # Add more fine-grained logic if needed
        if 'unauthorized' in details or 'without permissions' in details:
            return 'Ignore (Script does not test unauthorized users)'
        if 'edit' in details and 'draft' in details:
            return 'Ignore (Script does not test editing Draft POs)'
        if 'browser' in details or 'screen size' in details:
            return 'Ignore (Script does not test multiple browsers or screen sizes)'
        return 'Covered: Automated by Playwright script for Basic Information tab and related navigation/validation.'
    # Not covered
    return 'Ignore'

input_file = 'tests/TestCaseBasic_with_Results.csv'
output_file = 'tests/TestCaseBasic_with_Results_filled.csv'

with open(input_file, 'r', newline='', encoding='utf-8') as infile, \
     open(output_file, 'w', newline='', encoding='utf-8') as outfile:
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames
    if 'Automated Actual Result' not in fieldnames:
        fieldnames.append('Automated Actual Result')
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    for row in reader:
        row['Automated Actual Result'] = get_automated_result(row)
        writer.writerow(row)

print(f"Updated file saved as {output_file}") 