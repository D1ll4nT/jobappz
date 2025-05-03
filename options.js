/**
 * Job Application Autofill & Gemini Rewriter
 * Options page script for managing profile, API keys, and resume parsing
 */

/* global chrome */
// NOTE: pdfjsLib must be available (via CDN or bundler)
const form = document.getElementById('opts');
const resumeFile = document.getElementById('resumeFile');
const resumeStatus = document.getElementById('resumeStatus');

// Add PDF.js script dynamically if it's not already loaded
if (typeof pdfjsLib === 'undefined') {
  // Add PDF.js from CDN
  const pdfJsScript = document.createElement('script');
  pdfJsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  document.head.appendChild(pdfJsScript);
  
  // Configure worker
  pdfJsScript.onload = () => {
    const workerScript = document.createElement('script');
    workerScript.textContent = 'pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";';
    document.head.appendChild(workerScript);
  };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Load stored settings and resume status
  loadSettings();
  
  // Setup event listeners
  setupEventListeners();
});

/**
 * Load settings from chrome.storage
 */
async function loadSettings() {
  try {
    // Load all sync storage settings
    const stored = await chrome.storage.sync.get(null);
    Object.keys(stored).forEach(k => {
      const el = form.elements[k];
      if (el) {
        if (el.type === 'checkbox') {
          el.checked = Boolean(stored[k]);
        } else {
          el.value = stored[k] || '';
        }
      }
    });
    
    // Check for resume data
    const local = await chrome.storage.local.get('resumeData');
    if (local.resumeData) {
      const fieldCount = Object.keys(local.resumeData).filter(k => local.resumeData[k]).length;
      resumeStatus.textContent = `Resume parsed and loaded. Found ${fieldCount} fields.`;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    resumeStatus.textContent = 'Error loading settings: ' + error.message;
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Resume file upload
  resumeFile.addEventListener('change', handleResumeUpload);
  
  // Form submission
  form.addEventListener('submit', handleFormSubmit);
}

/**
 * Handle resume PDF upload
 * @param {Event} e - Change event from file input
 */
async function handleResumeUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.type !== 'application/pdf') {
    resumeStatus.textContent = 'Please select a PDF file.';
    return;
  }
  
  resumeStatus.textContent = 'Parsing resume...';
  
  try {
    // Wait for PDF.js to load if it was dynamically added
    if (typeof pdfjsLib === 'undefined') {
      resumeStatus.textContent = 'Waiting for PDF parser to load...';
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (typeof pdfjsLib !== 'undefined') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
    }
    
    // Parse the PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    
    // Extract resume data
    const resumeData = extractResumeData(text);
    
    // Save to chrome.storage.local
    await chrome.storage.local.set({resumeData});
    
    // Show success message
    const fieldCount = Object.keys(resumeData).filter(k => resumeData[k]).length;
    resumeStatus.textContent = `Resume parsed successfully. Found ${fieldCount} fields.`;
  } catch (err) {
    resumeStatus.textContent = 'Failed to parse PDF: ' + (err.message || 'Unknown error');
    console.error('Resume parse error:', err);
  }
}

/**
 * Extract structured data from resume text
 * @param {string} text - Extracted text from PDF
 * @returns {Object} Structured data object
 */
function extractResumeData(text) {
  const data = {};
  
  try {
    // Name: first line, or before email/phone
    const lines = text.split(/\n|\r/).map(l => l.trim()).filter(Boolean);
    
    // Extract first and last name from first line if it looks like a name
    if (lines[0] && /^[A-Z][a-z]+ +[A-Z][a-z]+/.test(lines[0])) {
      const nameParts = lines[0].split(/\s+/);
      if (nameParts.length >= 2) {
        data.firstName = nameParts[0] || '';
        data.lastName = nameParts.slice(1).join(' ') || '';
      }
    }
    
    // Email (look for standard email format)
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/);
    if (emailMatch) data.email = emailMatch[0];
    
    // Phone (various formats)
    const phoneMatch = text.match(/(?:\+\d{1,2}\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) data.phone = phoneMatch[0];
    
    // LinkedIn URL
    const linkedinMatch = text.match(/https?:\/\/(www\.)?linkedin\.com\/[a-z0-9-/]+/i);
    if (linkedinMatch) data.linkedin = linkedinMatch[0];
    
    // Website (not LinkedIn)
    const websiteMatch = text.match(/https?:\/\/(?!www\.linkedin\.com)[\w.-]+\.[a-z]{2,}(\S*)?/i);
    if (websiteMatch) data.website = websiteMatch[0];
    
    // Look for address patterns
    const addressMatch = text.match(/\d+\s+[A-Za-z\s,]+(?:Avenue|Ave|Boulevard|Blvd|Circle|Cir|Court|Ct|Drive|Dr|Lane|Ln|Place|Pl|Plaza|Plz|Road|Rd|Square|Sq|Street|St|Way)[,.\s]/i);
    if (addressMatch) data.street = addressMatch[0].trim();
    
    // City and state (common format: "City, State ZIP")
    const cityStateMatch = text.match(/([A-Za-z\s]+),\s*([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
    if (cityStateMatch) {
      data.city = cityStateMatch[1].trim();
      data.state = cityStateMatch[2];
      data.zip = cityStateMatch[3];
    }
  } catch (error) {
    console.error('Error extracting resume data:', error);
  }
  
  return data;
}

/**
 * Handle form submission
 * @param {Event} e - Submit event
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  try {
    // Collect form data
    const formData = new FormData(form);
    const data = {};
    
    // Process each form field
    for (const [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    // Add checkbox values
    data.autofillEnabled = form.elements.autofillEnabled.checked;
    
    // Create profile object from form data
    const profile = {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      linkedin: data.linkedin || '',
      website: data.website || '',
      // Add additional profile fields as needed
    };
    
    // Merge with resume data if available
    const local = await chrome.storage.local.get('resumeData');
    if (local.resumeData) {
      // For each field, prefer form data, but use resume data if form is empty
      Object.keys(local.resumeData).forEach(key => {
        if (!profile[key] && local.resumeData[key]) {
          profile[key] = local.resumeData[key];
        }
      });
    }
    
    // Add profile to data
    data.profile = profile;
    
    // Save to chrome.storage.sync
    await chrome.storage.sync.set(data);
    
    // Show success message
    alert('Settings saved successfully!');
  } catch (error) {
    console.error('Error saving settings:', error);
    alert('Error saving settings: ' + error.message);
  }
} 