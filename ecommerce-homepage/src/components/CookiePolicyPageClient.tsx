'use client';

import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { FooterNext } from './FooterNext';
import { MobileMenu } from './MobileMenu';
import { useState } from 'react';

export function CookiePolicyPageClient() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      router.push('/');
    } else if (view === 'experiences') {
      router.push('/esperienze');
    } else if (view === 'trips') {
      router.push('/viaggi');
    } else if (view === 'classes') {
      router.push('/classi');
    } else if (view === 'contacts') {
      router.push('/contatti');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onMenuClick={() => setIsMenuOpen(true)}
        onNavigate={handleNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8" style={{ color: 'var(--text-dark)' }}>
          Cookie Policy
        </h1>

        <div className="prose prose-lg max-w-none" style={{ color: 'var(--text-dark)' }}>
          <p className="text-sm mb-8" style={{ color: 'var(--text-gray)' }}>
            <strong>Ultimo aggiornamento:</strong> {new Date().toLocaleDateString('it-IT', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              1. Cosa sono i Cookie
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              I cookie sono piccoli file di testo che vengono memorizzati sul tuo dispositivo (computer, tablet o smartphone) 
              quando visiti un sito web. I cookie permettono al sito di ricordare le tue azioni e preferenze per un periodo 
              di tempo, così non devi reinserirle ogni volta che torni sul sito o navighi da una pagina all'altra.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              2. Tipi di Cookie Utilizzati
            </h2>
            
            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: 'var(--text-dark)' }}>
              2.1 Cookie Tecnici (Necessari)
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Questi cookie sono essenziali per il funzionamento del sito e non possono essere disattivati. 
              Permettono funzionalità di base come la navigazione tra le pagine e l'accesso ad aree protette del sito.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li><strong>cookieConsent:</strong> Memorizza la tua preferenza riguardo all'accettazione dei cookie</li>
              <li><strong>cookieConsentDate:</strong> Registra la data in cui hai espresso il consenso</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: 'var(--text-dark)' }}>
              2.2 Cookie di Prestazione e Analisi
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Questi cookie ci aiutano a capire come i visitatori interagiscono con il nostro sito web, raccogliendo 
              informazioni in forma anonima. Ci permettono di migliorare il funzionamento del sito e l'esperienza utente.
            </p>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <strong>Nota:</strong> Attualmente non utilizziamo cookie di terze parti per analisi. Se in futuro 
              implementeremo servizi di analisi, ti informeremo e richiederemo il tuo consenso.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: 'var(--text-dark)' }}>
              2.3 Cookie di Funzionalità
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Questi cookie permettono al sito di ricordare le scelte che fai (come il tuo nome utente, la lingua o 
              la regione) e forniscono funzionalità migliorate e più personalizzate.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              3. Finalità dell'Utilizzo dei Cookie
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Utilizziamo i cookie per le seguenti finalità:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>Garantire il corretto funzionamento del sito web</li>
              <li>Migliorare la sicurezza e prevenire frodi</li>
              <li>Ricordare le tue preferenze e impostazioni</li>
              <li>Analizzare l'utilizzo del sito per migliorare i nostri servizi</li>
              <li>Fornire contenuti personalizzati quando applicabile</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              4. Durata dei Cookie
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              I cookie che utilizziamo hanno diverse durate:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li><strong>Cookie di sessione:</strong> Vengono eliminati automaticamente quando chiudi il browser</li>
              <li><strong>Cookie persistenti:</strong> Rimangono sul tuo dispositivo per un periodo determinato o fino a quando non li elimini manualmente</li>
              <li><strong>Cookie di consenso:</strong> Rimangono memorizzati fino a quando non li elimini o non modifichi le tue preferenze</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              5. Gestione dei Cookie
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Puoi gestire o eliminare i cookie in qualsiasi momento attraverso le impostazioni del tuo browser. 
              Tuttavia, tieni presente che disabilitare alcuni cookie potrebbe limitare la funzionalità del sito.
            </p>
            
            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: 'var(--text-dark)' }}>
              5.1 Come Gestire i Cookie nel Tuo Browser
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              La maggior parte dei browser web accetta automaticamente i cookie, ma puoi modificare le impostazioni 
              del browser per rifiutare i cookie se preferisci. Ecco come fare per i browser più comuni:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li><strong>Google Chrome:</strong> Impostazioni → Privacy e sicurezza → Cookie e altri dati dei siti</li>
              <li><strong>Mozilla Firefox:</strong> Opzioni → Privacy e sicurezza → Cookie e dati dei siti</li>
              <li><strong>Safari:</strong> Preferenze → Privacy → Gestisci dati sito web</li>
              <li><strong>Microsoft Edge:</strong> Impostazioni → Cookie e autorizzazioni sito</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6" style={{ color: 'var(--text-dark)' }}>
              5.2 Modifica del Consenso
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Puoi modificare o revocare il tuo consenso ai cookie in qualsiasi momento eliminando i cookie dal tuo 
              browser. Al tuo prossimo accesso al sito, ti verrà nuovamente richiesto di esprimere le tue preferenze.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              6. Cookie di Terze Parti
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Attualmente, il nostro sito utilizza i seguenti servizi di terze parti che potrebbero impostare cookie:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li><strong>Stripe:</strong> Utilizzato per il processing dei pagamenti. I cookie di Stripe sono necessari 
              per completare le transazioni in modo sicuro. Per maggiori informazioni, consulta la{' '}
              <a href="https://stripe.com/it/privacy" target="_blank" rel="noopener noreferrer" 
                 className="underline" style={{ color: 'var(--primary-purple)' }}>
                Privacy Policy di Stripe
              </a>.</li>
              <li><strong>Supabase:</strong> Utilizzato per l'hosting e la gestione del database. I cookie tecnici di 
              Supabase sono necessari per il funzionamento del sito.</li>
            </ul>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Se in futuro implementeremo altri servizi di terze parti che utilizzano cookie, ti informeremo e 
              richiederemo il tuo consenso quando necessario.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              7. I Tuoi Diritti
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              In conformità con il Regolamento Generale sulla Protezione dei Dati (GDPR) e la normativa italiana 
              sulla privacy, hai i seguenti diritti:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li><strong>Diritto di accesso:</strong> Puoi richiedere informazioni sui cookie che utilizziamo</li>
              <li><strong>Diritto di opposizione:</strong> Puoi rifiutare i cookie non essenziali</li>
              <li><strong>Diritto di cancellazione:</strong> Puoi eliminare i cookie in qualsiasi momento</li>
              <li><strong>Diritto di revoca del consenso:</strong> Puoi revocare il consenso ai cookie in qualsiasi momento</li>
              <li><strong>Diritto di portabilità:</strong> Puoi richiedere una copia dei tuoi dati</li>
            </ul>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Per esercitare questi diritti, puoi contattarci all'indirizzo email indicato nella sezione "Contatti" 
              di questa policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              8. Base Giuridica
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              L'utilizzo dei cookie tecnici è basato sul legittimo interesse (art. 6, comma 1, lett. f del GDPR) 
              per garantire il corretto funzionamento del sito web.
            </p>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Per i cookie non essenziali (analisi, marketing, ecc.), la base giuridica è il consenso dell'utente 
              (art. 6, comma 1, lett. a del GDPR), che può essere revocato in qualsiasi momento.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              9. Trasferimento dei Dati
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Alcuni dei nostri fornitori di servizi (come Stripe e Supabase) possono essere situati al di fuori 
              dello Spazio Economico Europeo (SEE). In questi casi, assicuriamo che il trasferimento dei dati avvenga 
              in conformità con il GDPR, utilizzando meccanismi di salvaguardia appropriati come le Clausole Contrattuali 
              Standard approvate dalla Commissione Europea.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              10. Modifiche a Questa Cookie Policy
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Ci riserviamo il diritto di modificare questa Cookie Policy in qualsiasi momento per riflettere cambiamenti 
              nelle nostre pratiche o per altri motivi operativi, legali o normativi. Ti informeremo di eventuali 
              modifiche sostanziali pubblicando la nuova Cookie Policy su questa pagina e aggiornando la data di 
              "Ultimo aggiornamento".
            </p>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Ti consigliamo di consultare periodicamente questa pagina per rimanere informato su come utilizziamo i cookie.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              11. Contatti
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Per qualsiasi domanda, richiesta o reclamo riguardo all'utilizzo dei cookie o alla presente Cookie Policy, 
              puoi contattarci:
            </p>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="mb-2" style={{ color: 'var(--text-dark)' }}>
                <strong>Email:</strong>{' '}
                <a href="mailto:info@flixdog.com" className="underline" style={{ color: 'var(--primary-purple)' }}>
                  info@flixdog.com
                </a>
              </p>
              <p className="mb-2" style={{ color: 'var(--text-dark)' }}>
                <strong>Oggetto:</strong> Richiesta informazioni Cookie Policy
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4" style={{ color: 'var(--text-dark)' }}>
              12. Autorità di Controllo
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Se ritieni che il trattamento dei tuoi dati personali violi il GDPR, hai il diritto di presentare un 
              reclamo all'autorità di controllo competente. In Italia, l'autorità competente è:
            </p>
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <p className="mb-2" style={{ color: 'var(--text-dark)' }}>
                <strong>Garante per la Protezione dei Dati Personali</strong>
              </p>
              <p className="mb-2" style={{ color: 'var(--text-gray)' }}>
                Piazza di Monte Citorio, 121<br />
                00186 Roma
              </p>
              <p className="mb-2" style={{ color: 'var(--text-gray)' }}>
                Tel: +39 06 696771<br />
                Email: garante@gpdp.it<br />
                Web: <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" 
                         className="underline" style={{ color: 'var(--primary-purple)' }}>
                  www.garanteprivacy.it
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>

      <FooterNext />
    </div>
  );
}

