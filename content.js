// Autofill on page‑ready
(async () => {
  const {profile, autofillEnabled=true} = await chrome.storage.sync.get(['profile','autofillEnabled']);
  if (!autofillEnabled || !profile) return;

  // Map profile fields to likely form fields
  const fieldMap = {
    firstName:   [/first.*name/i,  /given.*name/i],
    lastName:    [/last.*name/i,   /family.*name/i],
    email:       [/email/i],
    phone:       [/phone/i, /tel/],
    street:      [/address.*1/i],
    city:        [/city/i],
    state:       [/state|province/i],
    zip:         [/zip|postal/i],
    linkedin:    [/linkedin/i],
    website:     [/portfolio|site/i]
  };

  Array.from(document.querySelectorAll('input,textarea,select')).forEach(el => {
    const name = el.name || el.id || '';
    for (const [key, patterns] of Object.entries(fieldMap)) {
      if (patterns.some(r => r.test(name))) {
        if (profile[key]) {
          el.value = profile[key];
          el.dispatchEvent(new Event('input', {bubbles:true}));
          break;
        }
      }
    }
  });
})();

// Capture submit events and send to background for logging
window.addEventListener('submit', async ev => {
  try{
    const form = ev.target;
    const data = {
      url: location.href,
      company: document.querySelector('[data-company], .company, [itemprop="hiringOrganization"]')?.textContent?.trim() || '',
      position: document.querySelector('[data-position], .position, [itemprop="title"]')?.textContent?.trim() || '',
      submitted: new Date().toISOString()
    };
    await chrome.runtime.sendMessage({type:'logApplication', payload:data});
  }catch(e){console.error(e);}  
}); 