/**
 * Servizio centralizzato per la gestione del consenso cookie iubenda
 * Gestisce end-to-end: verifica consenso → storage → prevenzione banner
 */

const CONSENT_FLAG = 'flixdog_iubenda_consent_given';
const IUBENDA_COOKIE_PREFIX = '_iub_cs-';
const IUBENDA_SITE_ID = '182148a6';

export interface ConsentStatus {
  hasConsent: boolean;
  timestamp?: number;
  source?: 'cookie' | 'localStorage' | 'api';
}

/**
 * Verifica se esiste un consenso valido per iubenda
 * Controlla in ordine: localStorage flag → cookie iubenda → API iubenda
 */
export function hasIubendaConsent(): boolean {
  // 1. Controlla il nostro flag nel localStorage (più affidabile e veloce)
  try {
    const ourFlag = localStorage.getItem(CONSENT_FLAG);
    if (ourFlag === 'true' || ourFlag === '1') {
      return true;
    }
  } catch (e) {
    // Ignora errori di localStorage (modalità incognito, ecc.)
  }

  // 2. Controlla i cookie di iubenda
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    const cookieParts = cookie.split('=');
    const name = cookieParts[0];
    const value = cookieParts[1] || '';

    // Controlla il cookie specifico di iubenda per questo sito
    if (
      name === `${IUBENDA_COOKIE_PREFIX}${IUBENDA_SITE_ID}` ||
      name.startsWith(IUBENDA_COOKIE_PREFIX) ||
      name === 'euconsent-v2'
    ) {
      // Verifica che il cookie contenga dati di consenso validi
      if (value && value.length > 0 && value !== 'null' && value !== 'undefined') {
        try {
          // Prova a parsare il valore JSON se è un oggetto
          const parsed = JSON.parse(decodeURIComponent(value));
          if (parsed && (parsed.consent || parsed.timestamp || parsed.purposes)) {
            // Salva anche il nostro flag per future visite
            saveConsentFlag();
            return true;
          }
        } catch (e) {
          // Se non è JSON, basta che abbia un valore significativo
          if (value.length > 5) {
            saveConsentFlag();
            return true;
          }
        }
      }
    }
  }

  // 3. Controlla localStorage di iubenda
  try {
    const localStorageKeys = [
      `${IUBENDA_COOKIE_PREFIX}${IUBENDA_SITE_ID}`,
      'iubenda_consent_given',
      'iubenda_consent',
    ];
    for (const key of localStorageKeys) {
      const stored = localStorage.getItem(key);
      if (stored && stored.length > 0) {
        saveConsentFlag();
        return true;
      }
    }

    // Controlla anche tutte le chiavi che contengono iubenda
    for (let j = 0; j < localStorage.length; j++) {
      const key = localStorage.key(j);
      if (key && (key.includes('_iub_cs') || key.includes('iubenda'))) {
        const value = localStorage.getItem(key);
        if (value && value.length > 0) {
          saveConsentFlag();
          return true;
        }
      }
    }
  } catch (e) {
    // Ignora errori di localStorage
  }

  // 4. Controlla l'API iubenda se disponibile
  try {
    if (typeof window !== 'undefined' && (window as any)._iub) {
      const iub = (window as any)._iub;
      if (iub.cs && iub.cs.hasConsent) {
        const hasConsent = iub.cs.hasConsent();
        if (hasConsent) {
          saveConsentFlag();
          return true;
        }
      }
    }
  } catch (e) {
    // Ignora errori
  }

  return false;
}

/**
 * Ottiene lo status completo del consenso
 */
export function getConsentStatus(): ConsentStatus {
  const hasConsent = hasIubendaConsent();
  
  if (!hasConsent) {
    return { hasConsent: false };
  }

  // Cerca di ottenere il timestamp se disponibile
  try {
    const flagData = localStorage.getItem(CONSENT_FLAG);
    if (flagData) {
      const parsed = JSON.parse(flagData);
      if (parsed && parsed.timestamp) {
        return {
          hasConsent: true,
          timestamp: parsed.timestamp,
          source: 'localStorage',
        };
      }
    }
  } catch (e) {
    // Ignora errori
  }

  return {
    hasConsent: true,
    source: 'cookie',
  };
}

/**
 * Salva il flag di consenso nel localStorage
 */
export function saveConsentFlag(): void {
  try {
    const consentData = {
      value: 'true',
      timestamp: Date.now(),
    };
    localStorage.setItem(CONSENT_FLAG, JSON.stringify(consentData));
  } catch (e) {
    // Se JSON fallisce, salva almeno il valore booleano
    try {
      localStorage.setItem(CONSENT_FLAG, 'true');
    } catch (e2) {
      console.error('[CookieService] Errore nel salvare il consenso', e2);
    }
  }
}

/**
 * Rimuove il consenso (per testing o reset)
 */
export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_FLAG);
  } catch (e) {
    console.error('[CookieService] Errore nel rimuovere il consenso', e);
  }
}

/**
 * Configura iubenda per non mostrare il banner se il consenso è già stato dato
 * Deve essere chiamato PRIMA di caricare gli script di iubenda
 */
export function configureIubendaSkipConsent(): void {
  if (typeof window === 'undefined') return;

  const hasConsent = hasIubendaConsent();
  
  // Configura iubenda PRIMA che gli script vengano caricati
  (window as any)._iub = (window as any)._iub || {};
  (window as any)._iub.csConfiguration = (window as any)._iub.csConfiguration || {};
  (window as any)._iub.csConfiguration.skipConsent = hasConsent;
  
  if (hasConsent) {
    console.log('[CookieService] Consenso già presente, iubenda configurato per saltare il banner');
  }
}

/**
 * Inizializza i listener per salvare il consenso quando viene dato
 */
export function initializeConsentListeners(): void {
  if (typeof window === 'undefined') return;

  // Aspetta che iubenda sia caricato
  const checkIubenda = setInterval(() => {
    if ((window as any)._iub && (window as any)._iub.cs) {
      clearInterval(checkIubenda);
      setupListeners();
    }
  }, 100);

  // Timeout dopo 5 secondi
  setTimeout(() => {
    clearInterval(checkIubenda);
  }, 5000);
}

function setupListeners(): void {
  try {
    const iub = (window as any)._iub;
    if (!iub || !iub.cs) return;

    // Listener per quando viene dato il consenso esplicito
    iub.cs.addEventListener('consentGiven', () => {
      saveConsentFlag();
      console.log('[CookieService] Consenso salvato (consentGiven)');
    });

    // Listener per quando il banner è pronto (consenso potrebbe essere già presente)
    iub.cs.addEventListener('consentReady', () => {
      setTimeout(() => {
        if (hasIubendaConsent()) {
          saveConsentFlag();
          console.log('[CookieService] Consenso verificato e salvato (consentReady)');
        }
      }, 500);
    });

    // Listener per quando il consenso viene aggiornato
    iub.cs.addEventListener('consentUpdated', () => {
      saveConsentFlag();
      console.log('[CookieService] Consenso aggiornato e salvato');
    });
  } catch (e) {
    console.error('[CookieService] Errore nel setup dei listener', e);
  }
}

