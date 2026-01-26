# Power Automate: Email Attachment to OneDrive

This guide sets up automatic saving of DCDA advising record attachments from email to OneDrive.

## Prerequisites

- Microsoft 365 account (TCU provides this)
- Access to Power Automate (flow.microsoft.com)
- OneDrive for Business

## Step 1: Create the OneDrive Folder

1. Open OneDrive
2. Create a new folder: `DCDA_Advising_Records`

## Step 2: Create the Power Automate Flow

1. Go to [flow.microsoft.com](https://flow.microsoft.com)
2. Click **Create** > **Automated cloud flow**
3. Name it: `DCDA Email Attachments to OneDrive`
4. Choose trigger: **When a new email arrives (V3)** (Office 365 Outlook)
5. Click **Create**

## Step 3: Configure the Trigger

Click the trigger to expand it. Set these parameters:

- **Folder**: Inbox
- **Subject Filter**: `DCDA Advising Record:`
- **Include Attachments**: Yes
- **Only with Attachments**: Yes

## Step 4: Add Apply to Each (for attachments)

1. Click **+ New step**
2. Search for **Apply to each** (under Control)
3. Click in the "Select an output from previous steps" field
4. In **Dynamic content**, select **Attachments** (from the trigger)

## Step 5: Add Create File Action (inside Apply to Each)

1. Inside the "Apply to each" block, click **Add an action**
2. Search for **Create file** (OneDrive for Business)
3. Configure:
   - **Folder Path**: `/DCDA_Advising_Records`
   - **File Name**: Click in the field, then from **Dynamic content** select **Attachments Name**
   - **File Content**: Click in the field, then from **Dynamic content** select **Attachments Content**

## Step 6: (Optional) Add Email Notification

1. After the "Apply to each" block, click **+ New step**
2. Search for **Send an email (V2)** (Office 365 Outlook)
3. Configure:
   - **To**: your email address
   - **Subject**: `DCDA Record Saved: ` then add **From** (Dynamic content from trigger)
   - **Body**: `A new advising record has been saved to OneDrive.`

## Step 7: Save and Test

1. Click **Save** (top right)
2. Use the DCDA Advisor app to submit a test record
3. Make sure to **attach the downloaded CSV** to the email before sending
4. In Power Automate, click **Test** > **Manually** > **Test**
5. Send the test email with attachment
6. Check your OneDrive folder for the saved file

## Troubleshooting

### Flow doesn't trigger
- Check the subject filter matches exactly: `DCDA Advising Record:`
- Make sure email arrives in Inbox (not spam/junk)
- Verify "Only with Attachments" is set to Yes
- Make sure the CSV file is attached before sending

### File not saved
- Verify the folder path is correct: `/DCDA_Advising_Records`
- Check that the folder exists in OneDrive
- Look at the flow run history for error details

### Duplicate files
- Power Automate will overwrite files with the same name
- Each CSV has a unique filename with student name and date

## Flow Summary

```
+---------------------------------------------+
| Trigger: New email arrives                  |
| Subject contains "DCDA Advising Record:"    |
| Has attachments: Yes                        |
+----------------------+----------------------+
                       |
                       v
+---------------------------------------------+
| Apply to Each: For each attachment          |
|   +---------------------------------------+ |
|   | Create File: Save to OneDrive         | |
|   | Folder: /DCDA_Advising_Records        | |
|   | Filename: Attachment Name             | |
|   +---------------------------------------+ |
+----------------------+----------------------+
                       |
                       v
+---------------------------------------------+
| (Optional) Send notification email          |
+---------------------------------------------+
```

## CSV File Format

The saved CSV files contain one row with these columns:

| Column | Description |
|--------|-------------|
| Timestamp | When the record was submitted |
| Name | Student name |
| DegreeType | major or minor |
| ExpectedGraduation | e.g., "Spring 2027" |
| ProgressHours | Hours completed toward degree |
| TotalHours | Total hours required |
| ProgressPercent | Percentage complete |
| CompletedCourses | Semicolon-separated course codes |
| ScheduledCourses | Semicolon-separated course codes |
| SpecialCredits | Transfer credits, study abroad, etc. |
| Notes | Student questions/notes |

You can open these CSV files directly in Excel, or import them into a master spreadsheet.

## Importing CSV to Excel

To consolidate multiple CSV files into one Excel spreadsheet:

1. Open Excel
2. Go to **Data** > **Get Data** > **From File** > **From Folder**
3. Select your `DCDA_Advising_Records` folder
4. Click **Combine** > **Combine & Load**
5. This creates a table that automatically updates when new files are added

## References

- [OneDrive for Business Connector](https://learn.microsoft.com/en-us/connectors/onedriveforbusiness/)
- [Apply to Each in Power Automate](https://learn.microsoft.com/en-us/power-automate/apply-to-each)
