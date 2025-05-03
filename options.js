/* global chrome */
// NOTE: pdfjsLib must be available (via CDN or bundler)
const form = document.getElementById('opts');
const resumeFile = document.getElementById('resumeFile');
const resumeStatus = document.getElementById('resumeStatus');

// Load settings on page load
(async () => {
  const stored = await chrome.storage.sync.get(null);
  Object.keys(stored).forEach(k => {
    const el = form.elements[k];
    if (el) {
      if (el.type === 'checkbox') el.checked = stored[k];
      else                        el.value  = stored[k];
    }
  });
  // Show resume status if already parsed
  const local = await chrome.storage.local.get('resumeData');
  if (local.resumeData) {
    resumeStatus.textContent = 'Resume parsed and loaded.';
  }
})();

// Resume PDF upload and parsing
resumeFile.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file || file.type !== 'application/pdf') {
    resumeStatus.textContent = 'Please select a PDF file.';
    return;
  }
  resumeStatus.textContent = 'Parsing resume...';
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Load PDF.js (assume pdfjsLib is available globally)
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    // Simple parsing: extract name, email, phone, etc.
    const resumeData = extractResumeData(text);
    await chrome.storage.local.set({resumeData});
    resumeStatus.textContent = 'Resume parsed and loaded.';
  } catch (err) {
    resumeStatus.textContent = 'Failed to parse PDF.';
    console.error('Resume parse error:', err);
  }
});

// Extract structured data from resume text (simple regex-based)
function extractResumeData(text) {
  const data = {};
  // Name: first line, or before email/phone
  const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
  data.firstName = lines[0]?.split(' ')[0] || '';
  data.lastName  = lines[0]?.split(' ').slice(1).join(' ') || '';
  // Email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
  if (emailMatch) data.email = emailMatch[0];
  // Phone
  const phoneMatch = text.match(/\+?\d[\d\s().-]{7,}\d/);
  if (phoneMatch) data.phone = phoneMatch[0];
  // LinkedIn
  const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/[\w\/-]+/i);
  if (linkedinMatch) data.linkedin = linkedinMatch[0];
  // Website
  const websiteMatch = text.match(/https?:\/\/(?!www\.linkedin\.com)[\w.-]+\.[a-z]{2,}(\S*)?/i);
  if (websiteMatch) data.website = websiteMatch[0];
  return data;
}

// Save settings
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  data.autofillEnabled = form.elements.autofillEnabled.checked;
  // Merge resumeData into profile if available
  const local = await chrome.storage.local.get('resumeData');
  if (local.resumeData) {
    data.profile = Object.assign({}, data, local.resumeData);
  } else {
    data.profile = Object.assign({}, data);
  }
  await chrome.storage.sync.set(data);
  alert('Saved.');
}); 