'use client';

import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { FooterNext } from './FooterNext';
import { MobileMenu } from './MobileMenu';
import { useState } from 'react';

export function RegolamentoPageClient() {
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
      
      <div className="max-w-4xl mx-auto px-6 md:px-12 py-12">
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-dark)' }}>
          Regolamento di Partecipazione FlixDog
        </h1>

        <div className="prose prose-lg max-w-none" style={{ color: 'var(--text-dark)' }}>
          <p className="text-lg mb-8" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
            Benvenuto nel branco! Per far sì che ogni nostra avventura sia sicura, rispettosa e indimenticabile per tutti (umani e 4 zampe), abbiamo creato questo "Patto del Viaggiatore". Partecipando ai nostri tour, accetti di seguire queste semplici ma fondamentali linee guida.
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
              1. Il Patto di Responsabilità e Collaborazione
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              FlixDog nasce per creare connessioni e avventure, ma il legame tra te e il tuo cane resta sovrano.
            </p>
            
            <ul className="list-disc pl-6 mb-4 space-y-3" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Responsabilità Individuale:</strong> Ogni partecipante è l'unico responsabile del comportamento del proprio cane. Anche se siamo in gruppo, il controllo costante del tuo compagno a 4 zampe spetta a te.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Diritto di Allontanamento:</strong> FlixDog non può verificare preventivamente lo stato di salute o il carattere di ogni cane. Pertanto, ci riserviamo il diritto di allontanare dal tour chiunque non rispetti i requisiti richiesti o chi, con comportamenti non collaborativi o disturbanti, comprometta la serenità e lo svolgimento dell'esperienza per il resto del gruppo.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Rispetto degli Spazi:</strong> Trattiamo ogni luogo come se fosse casa nostra. Eventuali danni causati dal cane a strutture, arredi o terzi saranno sotto la diretta responsabilità del proprietario.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
              2. Protezione FlixDog: Viaggi Senza Pensieri
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              A differenza di altre realtà, FlixDog ha a cuore la tua tranquillità fin dal primo passo.
            </p>
            
            <ul className="list-disc pl-6 mb-4 space-y-3" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Assicurazione Inclusa:</strong> Per ogni tour, FlixDog include nel pacchetto una copertura assicurativa per la Responsabilità Civile. Questo significa che, in caso di imprevisti o danni accidentali durante le attività del tour, sei protetto dalla nostra polizza collettiva. Vogliamo che la tua unica preoccupazione sia goderti il panorama!
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
              3. Identikit del Partecipante (Chi può salire a bordo)
            </h2>
            <p className="mb-4" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              Per la sicurezza del gruppo, i tour sono riservati a cani che rispondono a questi requisiti:
            </p>
            
            <ul className="list-disc pl-6 mb-4 space-y-3" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Età e Salute:</strong> I partecipanti devono avere almeno 6 mesi di età, essere in regola con le vaccinazioni e i trattamenti antiparassitari. Non sono ammessi cani con malattie contagiose o in stato di convalescenza.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Equilibrio Sociale:</strong> Non possono partecipare cani che abbiano manifestato aggressività verso persone o altri animali.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Gestione dell'Estro (Calore):</strong> Per garantire il benessere del gruppo, le femmine in calore non possono partecipare. Se l'estro dovesse manifestarsi nei 30 giorni precedenti la partenza o durante il tour, la partecipazione non sarà possibile. In questo caso, la mancata partecipazione sarà considerata come una cancellazione volontaria da parte del partecipante, soggetta alle normali penali previste.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Identificazione:</strong> Microchip e iscrizione all'anagrafe canina sono obbligatori.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
              4. Logistica e Condizioni di Viaggio
            </h2>
            
            <ul className="list-disc pl-6 mb-4 space-y-3" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Tassa di Soggiorno:</strong> La tassa di soggiorno, ove prevista dalla struttura ricettiva, è esclusa dalla quota di partecipazione. Dovrà essere saldata direttamente in loco al momento del check-in o del check-out, secondo le disposizioni della struttura.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Quota Minima Partecipanti:</strong> Lo svolgimento del tour è subordinato al raggiungimento di una quota minima di partecipanti. La conferma definitiva del viaggio avverrà un mese prima della data di partenza. In caso di mancato raggiungimento della quota, FlixDog si riserva il diritto di annullare il tour, garantendo il rimborso totale della quota versata.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Maltempo e Agenti Atmosferici:</strong> Le nostre avventure si svolgono quasi sempre! Nella gran parte dei casi, il viaggio o l'esperienza non verranno annullati in caso di maltempo o condizioni atmosferiche avverse. Solo in situazioni di estremo pericolo o impraticabilità, l'annullamento sarà comunicato tempestivamente. Eventuali eccezioni a questa regola (ad esempio, se l'esperienza è strettamente legata a condizioni meteo perfette) saranno specificate chiaramente nella sezione "Programma" della pagina prodotto.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
              5. Codice di Condotta e Attrezzatura
            </h2>
            
            <ul className="list-disc pl-6 mb-4 space-y-3" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Zampate Pulite:</strong> È obbligatorio raccogliere le deiezioni solide e sciacquare quelle liquide. Porta sempre con te i sacchetti igienici necessari.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Guinzaglio e Sicurezza:</strong> Il cane va tenuto al guinzaglio (lunghezza consigliata 1.5m). Non sono ammessi guinzagli estensibili (tipo Flexi) perché possono intralciare il gruppo o causare infortuni.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Nello Zaino:</strong> È obbligatorio avere sempre con sé una museruola (rigida o morbida) da utilizzare solo in caso di necessità, emergenza o richiesta delle autorità/strutture.
              </li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
              6. Sorrisi, Code e Community
            </h2>
            
            <ul className="list-disc pl-6 mb-4 space-y-3" style={{ color: 'var(--text-gray)', lineHeight: '1.8' }}>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>Raccontiamo l'Avventura:</strong> Durante i tour scatteremo foto e video per celebrare la nostra community. Partecipando, ci autorizzi a utilizzare queste immagini sui nostri canali.
              </li>
              <li>
                <strong style={{ color: 'var(--text-dark)' }}>La tua Privacy:</strong> Se preferisci non comparire nei nostri racconti digitali, segnalalo al team FlixDog prima della partenza.
              </li>
            </ul>
          </section>

          <div className="mt-12 p-6 rounded-lg" style={{ backgroundColor: 'var(--accent-soft)' }}>
            <p className="text-lg" style={{ color: 'var(--text-dark)', lineHeight: '1.8' }}>
              Ora che abbiamo messo i puntini sulle "i" e le zampe a terra, dimentica la burocrazia: prepara lo zaino, scalda i motori e preparati a scoprire il mondo attraverso gli occhi del tuo migliore amico. Il resto del branco ti sta già aspettando!
            </p>
          </div>
        </div>
      </div>

      <FooterNext />
    </div>
  );
}

