# Job Application Autofill & Gemini Rewriter Chrome Extension

A production-grade Chrome extension to autofill job-application forms with your stored profile, rewrite any highlighted field through Google Gemini-Pro, and automatically log every application into a Google Sheet via a lightweight Apps Script web-service. Now with local PDF resume parsing!

---

## File Tree

```
job-app-autofill-extension/
├── manifest.json
├── service_worker.js
├── content.js
├── popup.html
├── popup.js
├── options.html
├── options.js
├── README.md
```

---

## Features
- **Autofill** job application forms with your profile and parsed resume data
- **Rewrite** any highlighted field using Google Gemini-Pro (right-click context menu)
- **Log** every application submission to a Google Sheet
- **Parse** your PDF resume locally and extract key info for autofill

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
- Click the extension icon → **Options**
- Fill in your profile, Gemini API key, and Google Sheet Web App URL
- Upload your PDF resume (optional, but recommended)
- Click **Save**

---

## Usage

1. **Autofill**: Visit any job-application form, click the extension icon, and press **Autofill this page**. Fields will be filled from your profile and parsed resume.
2. **Rewrite**: Highlight any text in an input/textarea, right-click, and select **Rewrite with Gemini** to polish your answer.
3. **Logging**: On form submission, the application is logged to your Google Sheet.
4. **Resume Parsing**: Upload a PDF resume in Options. The extension will extract your name, email, phone, LinkedIn, and website for autofill.

---

## Security Notes
- All secrets are stored in `chrome.storage.sync` (encrypted at rest by Google). Resume data is stored locally (`chrome.storage.local`).
- Gemini API calls are made from the background service worker; no sensitive data is leaked to the content page.
- Your resume file is never uploaded—only parsed locally.

---

## Test Plan (Manual)

1. **Install extension** and open Options. Enter profile, API key, Sheet URL, and upload a PDF resume. Save.
2. **Visit a job application form**. Click the extension icon and press **Autofill this page**. Check that fields are filled.
3. **Highlight text** in a form field, right-click, and select **Rewrite with Gemini**. Confirm the text is rewritten.
4. **Submit the form**. Check your Google Sheet for a new row with the application info.
5. **Try uploading a non-PDF file** as a resume. Confirm error message.
6. **Change settings** (autofill toggle, rewrite tone) and verify behavior.

---

## Troubleshooting
- **Gemini not rewriting?** Check your API key in Options.
- **Sheet not logging?** Ensure your Apps Script is deployed as a Web App and the URL is correct.
- **Resume not parsing?** Only PDF files are supported. Try a simpler resume format.
- **Autofill not working?** Some sites use non-standard field names. Try editing your profile or resume for better matches.

---

## Credits & License
- Built by [Your Name].
- Uses [pdfjs-dist](https://mozilla.github.io/pdf.js/) for PDF parsing.
- MIT License. 