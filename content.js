/**
 * Job Application Autofill & Gemini Rewriter
 * Content script injected into every page
 */

/**
 * Main autofill function, can be called on page load or via popup
 * @param {boolean} forceExecute - Whether to ignore autofillEnabled setting
 * @returns {Promise<number>} Number of fields filled
 */
async function autofillPage(forceExecute = false) {
  try {
    const {profile, autofillEnabled = true} = await chrome.storage.sync.get(['profile', 'autofillEnabled']);
    if ((!autofillEnabled && !forceExecute) || !profile) {
      console.debug('Autofill disabled or no profile data');
      return 0;
    }

    // Map profile fields to likely form fields using regex patterns
    const fieldMap = {
      firstName:   [/first.*name/i, /given.*name/i, /^fname$/i, /^first$/i],
      lastName:    [/last.*name/i, /family.*name/i, /^lname$/i, /^last$/i],
      email:       [/^email$/i, /^e-mail$/i, /^mail$/i],
      phone:       [/^phone$/i, /^tel$/i, /telephone/i, /^mobile$/i],
      street:      [/^address$/i, /address.*1/i, /^street$/i, /address.*line/i],
      city:        [/^city$/i, /^town$/i],
      state:       [/^state$/i, /^province$/i, /^region$/i],
      zip:         [/^zip$/i, /^postal$/i, /postalcode/i, /^code$/i],
      linkedin:    [/linkedin/i, /^linked$/i],
      website:     [/portfolio/i, /^website$/i, /^site$/i, /personal.*url/i]
    };

    // Get all input, textarea, and select elements
    const formElements = Array.from(document.querySelectorAll('input, textarea, select'));
    let filledCount = 0;

    formElements.forEach(el => {
      // Skip hidden, disabled, or readonly fields
      if (el.hidden || el.disabled || el.readOnly || el.type === 'hidden' || el.type === 'submit' || 
          el.type === 'button' || el.type === 'file') {
        return;
      }

      // Get field identifiers (name, id, placeholder, label text)
      const fieldId = el.name || el.id || '';
      const placeholder = el.placeholder || '';
      // Find any associated label
      const labelText = el.labels && el.labels.length > 0 
        ? Array.from(el.labels).map(l => l.textContent).join(' ') 
        : '';
      
      // Combine identifiers for matching
      const fieldIdentifiers = (fieldId + ' ' + placeholder + ' ' + labelText).toLowerCase();
      
      // Try to match field to profile data
      for (const [key, patterns] of Object.entries(fieldMap)) {
        if (patterns.some(r => r.test(fieldIdentifiers))) {
          if (profile[key]) {
            el.value = profile[key];
            el.dispatchEvent(new Event('input', {bubbles: true}));
            el.dispatchEvent(new Event('change', {bubbles: true}));
            filledCount++;
            break;
          }
        }
      }
    });

    return filledCount;
  } catch (error) {
    console.error('Error during autofill:', error);
    return 0;
  }
}

// Expose function to window for access from popup script
window.autofillPage = autofillPage;

// Autofill on page load, but wait for DOM to be fully ready
// Many job application forms load dynamically or have react/angular frameworks
window.addEventListener('load', async () => {
  // Initial fill attempt
  let filledCount = await autofillPage();
  
  // If no fields filled, try again after a short delay
  // This helps with sites that load content dynamically
  if (filledCount === 0) {
    setTimeout(async () => {
      await autofillPage();
    }, 1500);
  }
});

// Listen for manual autofill triggers from popup
document.addEventListener('DOMContentLoaded', async () => {
  await autofillPage(true); // Force autofill regardless of setting
});

// Capture submit events and send to background for logging
window.addEventListener('submit', async (ev) => {
  try {
    const {autolog = true} = await chrome.storage.sync.get(['autolog']);
    if (!autolog) {
      return; // Skip logging if disabled
    }
    
    const data = {
      url: location.href,
      company: extractCompanyName(),
      position: extractPositionTitle(),
      submitted: new Date().toISOString()
    };
    
    await chrome.runtime.sendMessage({type: 'logApplication', payload: data});
  } catch (error) {
    console.error('Error logging application:', error);
  }
});

/**
 * Attempts to extract the company name from the page
 * @returns {string} Extracted company name or empty string
 */
function extractCompanyName() {
  // Try different selectors that might contain company info
  const selectors = [
    '[data-company]',
    '.company',
    '[itemprop="hiringOrganization"]',
    '.company-name',
    '#company-name',
    '[data-automation="company"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent.trim();
    }
  }
  
  // If all fails, try to get from document title or URL
  const titleMatch = document.title.match(/(?:at|with)\s+([A-Z][A-Za-z0-9\s&]+)/i);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return '';
}

/**
 * Attempts to extract the position title from the page
 * @returns {string} Extracted position title or empty string
 */
function extractPositionTitle() {
  // Try different selectors that might contain position info
  const selectors = [
    '[data-position]',
    '.position',
    '[itemprop="title"]',
    '.job-title',
    '#job-title',
    '[data-automation="position"]',
    'h1', // Often the job title is in the main heading
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent.trim();
    }
  }
  
  // If all fails, try to get from document title
  const titleMatch = document.title.match(/^([^|—-]+)/);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  return '';
} 