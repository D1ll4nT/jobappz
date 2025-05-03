/* global chrome */
document.getElementById('btn‑fill').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
  chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      document.dispatchEvent(new Event('DOMContentLoaded'));
    }
  });
});

document.getElementById('chk‑log').addEventListener('change', async (e) => {
  await chrome.storage.sync.set({autolog:e.target.checked});
}); 