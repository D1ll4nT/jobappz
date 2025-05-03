# Job Application Autofill & Gemini Rewriter Chrome Extension

A production-grade Chrome extension to autofill job-application forms with your stored profile, rewrite any highlighted field through Google Gemini-Pro, and automatically log every application into a Google Sheet via a lightweight Apps Script web-service. Now with local PDF resume parsing!

---

## File Tree

```
job-app-autofill-extension/
├── manifest.json
├── service_worker.js    # Background logic - Gemini API, Sheets logging, context-menu
├── content.js           # Content script - autofill, form detection, submission logging
├── popup.html           # Minimal popup UI
├── popup.js             # Popup controller
├── options.html         # Settings page with profile editor
├── options.js           # Settings controller with PDF parser
└── README.md            # Documentation
```

---

## Features

- **Enhanced Autofill**: Intelligently map profile and resume data to form fields using pattern matching
- **Smart Detection**: Better detection of field names, including labels, placeholders, and attributes
- **Rewriting**: Polish any text with Google Gemini-Pro via right-click context menu
- **Automated Logging**: Log all job applications to your Google Sheet
- **PDF Resume Parsing**: Extract profile data from your resume for easier form filling
- **Improved UI**: Modern, user-friendly interface with status indicators
- **Error Handling**: Robust error reporting and recovery mechanisms
- **Accessibility**: Better keyboard navigation and screen reader support

---

## Code Quality Improvements

- **Type Safety**: Added JSDoc comments and better type checking
- **Error Handling**: Robust error handling throughout the codebase
- **Modular Design**: Refactored code into reusable functions
- **Responsive UI**: Better styling and user feedback
- **Dynamic Loading**: PDF.js is loaded only when needed
- **Best Practices**: Follows Chrome Extension best practices
- **Performance**: Optimized for speed and reliability

---

## Setup & Installation

### 1. Clone or Download

Clone or unzip the folder contents to your computer.

### 2. Load Extension in Chrome

- Open **Chrome → Extensions → Developer mode ON → Load unpacked**
- Select the project folder

### 3. Set Up Google Sheet & Apps Script

1. Create a new Google Sheet (e.g., "Job Applications").
2. Go to **Extensions → Apps Script** and paste the following code:

```js
function doPost(e){
  const row = JSON.parse(e.postData.contents);
  const ss  = SpreadsheetApp.openById('YOUR_SHEET_ID');
  const sh  = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  if (sh.getLastColumn() === 0) {
    sh.appendRow(['Timestamp','Company','Position','URL','Status']);
  }
  sh.appendRow([new Date(), row.company, row.position, row.url, 'Submitted']);
  return ContentService.createTextOutput('ok');
}
```

- Replace `'YOUR_SHEET_ID'` with your Sheet's ID (from the URL).
- Deploy as **Web App** (execute as you, access: anyone).
- Copy the Web App URL for use in the extension options.

### 4. Get a Gemini API Key

- Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and create a Gemini-Pro API key.
- Copy the key for use in the extension options.

### 5. Configure Extension Options

- Click the extension icon → **Edit profile & settings**
- Fill in your profile, Gemini API key, and Google Sheet Web App URL
- Upload your PDF resume (automatically parsed for profile data)
- Click **Save Settings**

---

## Usage

1. **Autofill**: Visit any job-application form, click the extension icon, and press **Autofill this page**. Fields will be filled from your profile and parsed resume. The extension shows how many fields were autofilled.

2. **Rewrite**: Highlight text in any form field, right-click, and select **Rewrite with Gemini** to polish your answer with a professional tone.

3. **Logging**: Toggle the "Log this application" switch in the popup to enable/disable automatic logging. When enabled, form submissions are logged to your Google Sheet.

4. **Resume Parsing**: Upload a PDF resume in Options. The extension extracts your name, email, phone, LinkedIn, address and website for autofill.

---

## Security Notes

- **Data Storage**: Profile data is stored in `chrome.storage.sync` (encrypted at rest by Google). Resume data is stored locally in `chrome.storage.local`.
- **API Security**: API calls to Gemini are made from the background service worker with proper error handling.
- **Local Processing**: Your resume is parsed entirely locally—no data is sent to external servers.
- **Error Handling**: All API calls include proper error handling to prevent data leakage.
- **Host Permissions**: The extension only requests permissions for the specific APIs it needs.

---

## Test Plan (Manual)

1. **Install extension** and open Options. Enter profile, API key, Sheet URL, and upload a PDF resume. Save.
2. **Visit a job application form**. Click the extension icon and press **Autofill this page**. Verify the status shows the number of fields filled.
3. **Highlight text** in a form field, right-click, and select **Rewrite with Gemini**. Confirm the text is rewritten.
4. **Toggle logging** in the popup and submit the form. Check your Google Sheet for a new row with the application info.
5. **Try different resume formats** to test the parser's robustness.
6. **Test error recovery** by providing invalid API keys or URLs.

---

## Troubleshooting

- **Autofill not detecting fields?** Check the field names in the website. You may need to adjust your profile data.
- **Gemini not rewriting?** Ensure your API key is correct and you have an internet connection.
- **Sheet not logging?** Verify your Web App URL and check the browser console for error messages.
- **Resume parsing issues?** Ensure your PDF is text-based, not scanned images. The parser works best with standard resume formats.
- **UI issues?** Try reloading the extension or restarting Chrome.
- **Extension not loading?** Check Chrome's extension error logs (chrome://extensions) for details.

---

## Credits & License

- Built by Dillan Thrasher.
- Uses [PDF.js](https://mozilla.github.io/pdf.js/) for PDF parsing.
- MIT License. 