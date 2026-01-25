# Power Automate: Email to OneDrive Excel

This guide sets up automatic transfer of DCDA advising records from email to an Excel spreadsheet in OneDrive.

## Prerequisites

- Microsoft 365 account (TCU provides this)
- Access to Power Automate (flow.microsoft.com)
- OneDrive for Business

## Step 1: Create the Excel Spreadsheet

1. Open OneDrive and create a new folder: `DCDA_Advising_Records`
2. Create a **new blank Excel workbook**: `Advising_Log.xlsx`
3. In cell A1, add these column headers across the first row:

```
A1: Timestamp
B1: Name
C1: DegreeType
D1: ExpectedGraduation
E1: ProgressHours
F1: TotalHours
G1: ProgressPercent
H1: CompletedCourses
I1: ScheduledCourses
J1: Notes
```

**Important**: Column headers must be single words (no spaces) for Power Automate compatibility.

4. Select cells A1:J1
5. Go to **Insert** > **Table**
6. Check "My table has headers" and click OK
7. With the table selected, go to **Table Design** tab
8. In the "Table Name" field (top left), rename it to: `AdvisingRecords`
9. Save and **close the file completely**

## Step 2: Create the Power Automate Flow

1. Go to [flow.microsoft.com](https://flow.microsoft.com)
2. Click **Create** > **Automated cloud flow**
3. Name it: `DCDA Email to Excel`
4. Choose trigger: **When a new email arrives (V3)** (Office 365 Outlook)
5. Click **Create**

## Step 3: Configure the Trigger

Click the trigger to expand it. Set these parameters:

- **Folder**: Inbox
- **Subject Filter**: `DCDA Advising Record:`
- **Include Attachments**: No
- Click **Show advanced options** if needed

## Step 4: Add Compose Action (Extract Base64 Data)

1. Click **+ New step**
2. Search for **Compose** (under Data Operations)
3. Rename it to: `Extract Base64`
4. Click in the **Inputs** field
5. Click **Expression** tab (not Dynamic content)
6. Paste this expression and click **OK**:

```
substring(triggerOutputs()?['body/body'],add(indexOf(triggerOutputs()?['body/body'],'<!--DCDA_JSON_START-->'),21),sub(indexOf(triggerOutputs()?['body/body'],'<!--DCDA_JSON_END-->'),add(indexOf(triggerOutputs()?['body/body'],'<!--DCDA_JSON_START-->'),21)))
```

## Step 5: Add Compose Action (Decode Base64)

1. Click **+ New step**
2. Search for **Compose** (under Data Operations)
3. Rename it to: `Decode JSON`
4. Click in the **Inputs** field
5. Click **Expression** tab
6. Paste this expression and click **OK**:

```
base64ToString(outputs('Extract_Base64'))
```

**Note**: The JSON data is base64-encoded to prevent formatting issues with email HTML encoding.

## Step 6: Add Parse JSON Action

1. Click **+ New step**
2. Search for **Parse JSON** (under Data Operations)
3. Click in the **Content** field
4. In the **Dynamic content** tab, select **Outputs** (from the `Decode JSON` step)
5. Click **Generate from sample** button
6. Paste this sample and click **Done**:

```json
{"version":"2.0","timestamp":"2026-01-24T12:00:00.000Z","name":"John Smith","degreeType":"major","expectedGraduation":"Spring 2027","progressHours":15,"totalHours":30,"progressPercent":50,"completedCourses":"DCDA 1000; DCDA 2000","scheduledCourses":"DCDA 3000","specialCredits":"","notes":"Sample notes"}
```

## Step 7: Add Excel Action (Add Row)

1. Click **+ New step**
2. Search for **Add a row into a table** (Excel Online Business)
3. Configure the connection:
   - **Location**: OneDrive for Business
   - **Document Library**: OneDrive
   - **File**: Browse to `/DCDA_Advising_Records/Advising_Log.xlsx`
   - **Table**: Select `AdvisingRecords`

4. After selecting the table, column fields should appear. If you get an error about "dynamic schema too large":
   - Make sure the Excel file is closed
   - Delete any extra columns/data in the spreadsheet
   - Ensure only columns A-J have headers
   - Try refreshing the flow editor

5. Map each column by clicking the field and selecting from **Dynamic content** > **Parse JSON**:

   | Field | Select from Parse JSON |
   |-------|----------------------|
   | Timestamp | timestamp |
   | Name | name |
   | DegreeType | degreeType |
   | ExpectedGraduation | expectedGraduation |
   | ProgressHours | progressHours |
   | TotalHours | totalHours |
   | ProgressPercent | progressPercent |
   | CompletedCourses | completedCourses |
   | ScheduledCourses | scheduledCourses |
   | Notes | notes |

## Step 8: Save and Test

1. Click **Save** (top right)
2. Use the DCDA Advisor app to submit a test record
3. In Power Automate, click **Test** > **Manually** > **Test**
4. Send the test email
5. Watch the flow run and check for errors
6. Open your Excel file in OneDrive to verify the row was added

## Troubleshooting

### "Dynamic schema too large" error
- Close the Excel file completely before editing the flow
- Delete all empty columns beyond J
- Delete all rows except the header row
- Make sure column headers have no spaces
- Refresh the browser and try again

### Flow doesn't trigger
- Check the subject filter matches exactly: `DCDA Advising Record:`
- Make sure email arrives in Inbox (not spam/junk)
- Wait a few minutes - there can be a delay

### JSON parsing fails
- Check the Compose step output in flow run history
- The email must contain `<!--DCDA_JSON_START-->` and `<!--DCDA_JSON_END-->` markers
- Make sure you're using the updated version of the app

### Excel row not added
- Verify the file path is correct
- Ensure the table is named exactly `AdvisingRecords`
- Check that the Excel file isn't open elsewhere

## Flow Summary

```
┌─────────────────────────────────────────────┐
│ Trigger: New email arrives                  │
│ Subject contains "DCDA Advising Record:"    │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ Compose: Extract Base64 from email body     │
│ (text between the JSON markers)             │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ Compose: Decode Base64 to JSON string       │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ Parse JSON: Convert text to data fields     │
└──────────────────┬──────────────────────────┘
                   ▼
┌─────────────────────────────────────────────┐
│ Add row to Excel table in OneDrive          │
└─────────────────────────────────────────────┘
```

## References

- [Excel Online Business Connector](https://learn.microsoft.com/en-us/connectors/excelonlinebusiness/)
- [Add Rows to Excel in Power Automate](https://www.spguides.com/add-rows-to-excel-in-power-automate/)
