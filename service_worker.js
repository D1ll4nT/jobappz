/**
 * Job Application Autofill & Gemini Rewriter
 * Background service worker for Chrome extension
 */

// On install: create context‑menu item for editable fields
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'rewriteGemini',
    title: 'Rewrite with Gemini',
    contexts: ['editable']
  });
});

// Context‑menu handler – pulls selection, feeds Gemini, replaces text
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'rewriteGemini') return;
  if (!tab?.id) {
    console.error('No valid tab ID for context menu action');
    return;
  }

  try {
    // Ask content script for current selection
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      func: () => {
        const el = document.activeElement;
        if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          return {text: '', ok: false};
        }
        const start = el.selectionStart ?? 0;
        const end   = el.selectionEnd   ?? el.value.length;
        return {text: el.value.substring(start, end), ok: true};
      }
    });
    
    if (!result.ok || !result.text) {
      console.warn('No valid text selection to rewrite');
      return;
    }

    const {apiKey, rewriteTone} = await chrome.storage.sync.get(['apiKey','rewriteTone']);
    if (!apiKey) {
      await chrome.notifications.create({
        type: 'basic', 
        iconUrl: chrome.runtime.getURL('icon48.png') || '', 
        title: 'Gemini API key missing', 
        message: 'Set it in the extension options.'
      });
      return;
    }

    // Call Gemini‑Pro
    const rewritten = await geminiRewrite(apiKey, result.text, rewriteTone || 'concise professional');
    
    if (!rewritten) {
      console.warn('Gemini returned empty response');
      return;
    }

    // Replace in the page
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      args: [rewritten],
      func: (text) => {
        const el = document.activeElement;
        if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
          return;
        }
        const start = el.selectionStart ?? 0;
        const end   = el.selectionEnd   ?? el.value.length;
        el.setRangeText(text, start, end, 'end');
        el.dispatchEvent(new Event('input', {bubbles: true}));
      }
    });
  } catch (error) {
    console.error('Error during Gemini rewrite:', error);
  }
});

/**
 * Call Gemini-Pro to rewrite text in the specified tone
 * @param {string} apiKey - Gemini API key
 * @param {string} original - Original text to rewrite
 * @param {string} tone - Tone for rewriting (e.g., "concise professional")
 * @returns {Promise<string>} Rewritten text, or original if error
 */
async function geminiRewrite(apiKey, original, tone){
  try {
    const body = {
      contents: [{parts: [{text: `Rewrite the following in a ${tone} tone:\n\n"${original}"`}]}]
    };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json'}, 
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      console.error(`Gemini API error: ${res.status} ${res.statusText}`);
      return original;
    }
    
    const json = await res.json();
    return json.candidates?.[0]?.content?.parts?.[0]?.text || original;
  } catch (error) {
    console.error('Gemini rewrite error:', error);
    return original;
  }
}

// Receive application‑log requests from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
  if (msg.type === 'logApplication') {
    logToSheet(msg.payload)
      .then(() => sendResp({ok: true}))
      .catch(error => {
        console.error('Error logging to sheet:', error);
        sendResp({ok: false, error: error.message});
      });
    return true; // keep channel open for async response
  }
});

/**
 * Log application to Google Sheet via Apps Script endpoint
 * @param {Object} entry - Application data to log
 * @returns {Promise<Response>} Fetch response
 */
async function logToSheet(entry){
  const {sheetEndpoint} = await chrome.storage.sync.get(['sheetEndpoint']);
  if (!sheetEndpoint) {
    console.warn('No sheet endpoint configured for logging');
    return null;
  }
  
  return fetch(sheetEndpoint, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(entry)
  });
} 