/**
 * Hook per gestire il consenso cookie iubenda
 * Usa il servizio centralizzato cookieService per una gestione consistente
 */

import { useEffect, useState } from 'react';
import { hasIubendaConsent, getConsentStatus, initializeConsentListeners } from '../utils/cookieService';

export function useIubendaConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [consentStatus, setConsentStatus] = useState<ReturnType<typeof getConsentStatus> | null>(null);

  useEffect(() => {
    // Inizializza i listener per salvare il consenso quando viene dato
    initializeConsentListeners();

    // Controlla il consenso al mount
    const checkConsent = () => {
      const consent = hasIubendaConsent();
      const status = getConsentStatus();
      setHasConsent(consent);
      setConsentStatus(status);
    };

    checkConsent();

    // Ascolta i cambiamenti nei cookie (quando l'utente accetta)
    const checkInterval = setInterval(() => {
      const newConsent = hasIubendaConsent();
      if (newConsent !== hasConsent) {
        checkConsent();
        clearInterval(checkInterval);
      }
    }, 500);

    // Pulisci l'intervallo dopo 10 secondi (dopo che l'utente ha avuto tempo di accettare)
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 10000);

    return () => {
      clearInterval(checkInterval);
    };
  }, [hasConsent]);

  return {
    hasConsent,
    consentStatus,
  };
}

