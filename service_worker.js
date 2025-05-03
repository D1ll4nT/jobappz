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
  if (!result.ok || !result.text) return;

  const {apiKey, rewriteTone} = await chrome.storage.sync.get(['apiKey','rewriteTone']);
  if (!apiKey) {
    chrome.notifications.create({type:'basic', iconUrl:'', title:'Gemini API key missing', message:'Set it in the extension options.'});
    return;
  }

  // Call Gemini‑Pro
  const rewritten = await geminiRewrite(apiKey, result.text, rewriteTone || 'concise professional');

  // Replace in the page
  await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    args: [rewritten],
    func: (text) => {
      const el = document.activeElement;
      const start = el.selectionStart ?? 0;
      const end   = el.selectionEnd   ?? el.value.length;
      el.setRangeText(text,start,end,'end');
      el.dispatchEvent(new Event('input', {bubbles:true}));
    }
  });
});

// Gemini-Pro rewrite function
async function geminiRewrite(apiKey, original, tone){
  const body = {
    contents:[{parts:[{text:`Rewrite the following in a ${tone} tone:\n\n"${original}"` }]}]
  };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  if(!res.ok) return original;
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || original;
}

// Receive application‑log requests from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResp) => {
  if (msg.type === 'logApplication') {
    logToSheet(msg.payload).then(()=>sendResp({ok:true}));
    return true; // keep channel open for async response
  }
});

// Log application to Google Sheet via Apps Script endpoint
async function logToSheet(entry){
  const {sheetEndpoint} = await chrome.storage.sync.get(['sheetEndpoint']);
  if(!sheetEndpoint) return;
  await fetch(sheetEndpoint, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(entry)
  });
} 