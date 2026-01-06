(function() {
  'use strict';
  
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname.includes('localhost');
  
  function safeLog(message) {
    if (isDevelopment) {
      console.log(message);
    }
  }
  
  function safeError(message, error) {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
  
  const CONSENT_FLAG = 'flixdog_iubenda_consent_given';
  const IUBENDA_COOKIE_PREFIX = '_iub_cs-';
  const IUBENDA_SITE_ID = '182148a6';
  const IUBENDA_COOKIE_NAME = IUBENDA_COOKIE_PREFIX + IUBENDA_SITE_ID;
  
  function hasIubendaConsent() {
    try {
      const ourFlag = localStorage.getItem(CONSENT_FLAG);
      if (ourFlag === 'true' || ourFlag === '1') {
        return true;
      }
      try {
        const flagData = JSON.parse(ourFlag);
        if (flagData && (flagData.value === 'true' || flagData.value === '1')) {
          return true;
        }
      } catch(e) {}
    } catch(e) {}
    
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      const cookieParts = cookie.split('=');
      const name = cookieParts[0];
      const value = cookieParts[1] || '';
      
      if (name === IUBENDA_COOKIE_NAME || 
          name.indexOf(IUBENDA_COOKIE_PREFIX) === 0 || 
          name === 'euconsent-v2') {
        if (value && value.length > 0 && value !== 'null' && value !== 'undefined') {
          try {
            const parsed = JSON.parse(decodeURIComponent(value));
            if (parsed && (parsed.consent || parsed.timestamp || parsed.purposes)) {
              saveConsentFlag();
              return true;
            }
          } catch(e) {
            if (value.length > 5) {
              saveConsentFlag();
              return true;
            }
          }
        }
      }
    }
    
    try {
      const localStorageKeys = [IUBENDA_COOKIE_NAME, 'iubenda_consent_given', 'iubenda_consent'];
      for (let k = 0; k < localStorageKeys.length; k++) {
        const stored = localStorage.getItem(localStorageKeys[k]);
        if (stored && stored.length > 0) {
          saveConsentFlag();
          return true;
        }
      }
      for (let j = 0; j < localStorage.length; j++) {
        const key = localStorage.key(j);
        if (key && (key.indexOf('_iub_cs') !== -1 || key.indexOf('iubenda') !== -1)) {
          const value = localStorage.getItem(key);
          if (value && value.length > 0) {
            saveConsentFlag();
            return true;
          }
        }
      }
    } catch(e) {}
    
    return false;
  }
  
  function saveConsentFlag() {
    try {
      const consentData = {
        value: 'true',
        timestamp: Date.now()
      };
      localStorage.setItem(CONSENT_FLAG, JSON.stringify(consentData));
    } catch(e) {
      try {
        localStorage.setItem(CONSENT_FLAG, 'true');
      } catch(e2) {
        safeError('[iubenda] Errore nel salvare il consenso', e2);
      }
    }
  }
  
  function configureIubendaBeforeLoad() {
    if (typeof window === 'undefined') return;
    
    const hasConsent = hasIubendaConsent();
    
    window._iub = window._iub || {};
    window._iub.csConfiguration = window._iub.csConfiguration || {};
    window._iub.csConfiguration.skipConsent = hasConsent;
    
    if (hasConsent) {
      safeLog('[iubenda] Consenso già presente, configurato per saltare il banner');
    }
  }
  
  function setupConsentListeners() {
    const checkIubenda = setInterval(function() {
      if (typeof window !== 'undefined' && window._iub && window._iub.cs) {
        clearInterval(checkIubenda);
        
        try {
          window._iub.cs.addEventListener('consentGiven', function() {
            saveConsentFlag();
            safeLog('[iubenda] Consenso salvato (consentGiven)');
          });
          
          window._iub.cs.addEventListener('consentReady', function() {
            setTimeout(function() {
              if (hasIubendaConsent()) {
                saveConsentFlag();
                safeLog('[iubenda] Consenso verificato e salvato (consentReady)');
              }
            }, 500);
          });
          
          window._iub.cs.addEventListener('consentUpdated', function() {
            saveConsentFlag();
            safeLog('[iubenda] Consenso aggiornato e salvato');
          });
        } catch(e) {
          safeError('[iubenda] Errore nel setup dei listener', e);
        }
      }
    }, 100);
    
    setTimeout(function() {
      clearInterval(checkIubenda);
    }, 5000);
  }
  
  configureIubendaBeforeLoad();
  
  const hasConsent = hasIubendaConsent();
  
  if (!hasConsent) {
    safeLog('[iubenda] Nessun consenso trovato, caricamento iubenda...');
    
    const widgetScript = document.createElement('script');
    widgetScript.type = 'text/javascript';
    widgetScript.src = 'https://embeds.iubenda.com/widgets/182148a6-9273-4198-91e5-6370c31ca20d.js';
    widgetScript.async = true;
    document.head.appendChild(widgetScript);
    
    const loader = function() {
      if (!hasIubendaConsent()) {
        configureIubendaBeforeLoad();
        
        const s = document.createElement('script');
        const tag = document.getElementsByTagName('script')[0];
        s.src = 'https://cdn.iubenda.com/iubenda.js';
        s.async = true;
        
        tag.parentNode.insertBefore(s, tag);
        
        setTimeout(setupConsentListeners, 2000);
      } else {
        safeLog('[iubenda] Consenso trovato durante il caricamento, script non caricato');
      }
    };
    
    if (document.readyState === 'loading') {
      if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', loader, false);
      } else if (document.attachEvent) {
        document.attachEvent('onreadystatechange', function() {
          if (document.readyState === 'complete') {
            loader();
          }
        });
      }
    } else {
      loader();
    }
  } else {
    safeLog('[iubenda] Consenso già presente, iubenda non caricato');
  }
})();

