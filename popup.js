/**
 * Job Application Autofill & Gemini Rewriter
 * Popup script for extension popup UI
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize UI elements
  initializeUI();

  // Add event listeners
  setupEventListeners();
});

/**
 * Initialize UI elements with stored values
 */
async function initializeUI() {
  try {
    // Get autolog setting and update checkbox
    const {autolog = false} = await chrome.storage.sync.get(['autolog']);
    document.getElementById('chk-log').checked = autolog;
    
    // Get active tab info for status message
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (tab) {
      const domain = new URL(tab.url).hostname;
      setStatus(`Ready to autofill on ${domain}`);
    }
  } catch (error) {
    console.error('Error initializing popup UI:', error);
    setStatus('Error initializing UI');
  }
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  // Autofill button click handler
  document.getElementById('btn-fill').addEventListener('click', handleAutofill);
  
  // Options button click handler
  document.getElementById('btn-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Log checkbox change handler
  document.getElementById('chk-log').addEventListener('change', handleLogToggle);
}

/**
 * Handle autofill button click
 * Triggers autofill in the active tab
 */
async function handleAutofill() {
  try {
    setStatus('Filling form fields...');
    
    // Get active tab
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!tab?.id) {
      console.error('No active tab found');
      setStatus('Error: No active tab found');
      return;
    }
    
    // Execute autofill in the content script
    const results = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        // Check if autofillPage function exists in content script
        if (typeof window.autofillPage === 'function') {
          return window.autofillPage(true);
        } else {
          // Fallback: dispatch DOMContentLoaded event to trigger autofill
          document.dispatchEvent(new Event('DOMContentLoaded'));
          return -1; // Indicate we used fallback method
        }
      }
    });
    
    // Update status based on result
    const filledCount = results?.[0]?.result;
    if (filledCount !== undefined && filledCount >= 0) {
      setStatus(`Filled ${filledCount} form fields`);
    } else {
      setStatus('Form autofill completed');
    }
    
    // Close popup after short delay
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error('Error executing autofill:', error);
    setStatus('Error filling form');
  }
}

/**
 * Handle log checkbox change
 * Updates the autolog setting in storage
 * @param {Event} e - Change event
 */
async function handleLogToggle(e) {
  try {
    await chrome.storage.sync.set({autolog: e.target.checked});
    setStatus(e.target.checked ? 'Logging enabled' : 'Logging disabled');
  } catch (error) {
    console.error('Error saving autolog setting:', error);
    // Revert checkbox if save failed
    e.target.checked = !e.target.checked;
    setStatus('Error saving setting');
  }
}

/**
 * Update status message in UI
 * @param {string} message - Status message to display
 */
function setStatus(message) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = message;
  }
} 