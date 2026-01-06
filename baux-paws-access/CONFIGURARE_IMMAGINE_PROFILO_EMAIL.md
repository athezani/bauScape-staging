# Come Configurare l'Immagine Profilo del Mittente nelle Email

L'immagine profilo (avatar) che appare accanto all'email nei client email (come Gmail, Outlook, ecc.) viene configurata nelle **impostazioni del mittente** in Brevo, non nel template HTML.

## 📍 Dove Configurare

### Passaggi:

1. **Accedi a Brevo Dashboard**
   - Vai su: https://app.brevo.com
   - Accedi al tuo account

2. **Vai alle Impostazioni Sender**
   - Clicca su **Settings** (Impostazioni) nel menu laterale
   - Vai su **Senders & IP** > **Senders** (Mittenti)
   - Oppure vai direttamente a: https://app.brevo.com/settings/senders

3. **Trova o Crea il Mittente**
   - Cerca l'indirizzo email che usi come mittente
   - Per le email transazionali, verifica quale indirizzo è configurato nel template
   - Se non esiste, clicca su **Add a sender** (Aggiungi un mittente)

4. **Configura l'Immagine Profilo**
   - Clicca sul mittente che vuoi configurare
   - Nella sezione **Sender Details** (Dettagli Mittente), cerca **Profile Picture** o **Avatar**
   - Clicca su **Upload** o **Change** per caricare un'immagine
   - Carica un'immagine quadrata (consigliato: 200x200px o 400x400px)
   - Formato: JPG o PNG
   - Peso: max 2MB (meglio se < 500KB)

5. **Salva le Impostazioni**
   - Clicca su **Save** o **Salva**
   - L'immagine profilo verrà ora visualizzata nei client email che supportano questa funzionalità

## 📧 Indirizzi Email da Configurare

Verifica quale indirizzo email viene usato come mittente:

### Email Transazionali (Conferma Prenotazione)
- Le email transazionali usano il **sender configurato nel template Brevo**
- Per verificare quale indirizzo è configurato:
  1. Vai su **Email** > **Transazionale** > **Modelli**
  2. Apri il template "Order confirmation" (Template ID 2 o 3)
  3. Nelle impostazioni del template, cerca **Sender** o **From**
  4. Nota l'indirizzo email configurato

### Email di Contatto
- Usa: `noreply@flixdog.com` (configurato nel codice)
- Configura l'immagine profilo per questo indirizzo

## 🎨 Specifiche Immagine Profilo

- **Formato**: JPG o PNG (PNG consigliato se hai trasparenza)
- **Dimensioni**: Quadrata (1:1)
  - Minimo: 96x96px
  - Consigliato: 200x200px o 400x400px
  - Massimo: 1024x1024px
- **Peso**: Max 2MB (meglio se < 500KB per caricamento veloce)
- **Contenuto**: Logo aziendale, icona, o immagine rappresentativa

## ✅ Verifica

Dopo aver configurato l'immagine profilo:

1. **Invia un'email di test**
   - Completa una prenotazione di test
   - Oppure usa lo script di test email

2. **Controlla in Gmail**
   - Apri l'email ricevuta
   - L'immagine profilo dovrebbe apparire accanto al nome del mittente
   - Se non appare subito, potrebbe richiedere qualche minuto per la propagazione

3. **Controlla in altri client**
   - Outlook, Apple Mail, ecc. potrebbero mostrare l'immagine in modo diverso
   - Alcuni client email non supportano le immagini profilo personalizzate

## 🔧 Se l'Immagine Non Appare

### Possibili Cause:

1. **Cache del client email**
   - Alcuni client email (soprattutto Gmail) mettono in cache le immagini profilo
   - Potrebbe richiedere tempo per aggiornarsi (anche 24-48 ore)

2. **Dominio non verificato**
   - Assicurati che il dominio dell'indirizzo email sia verificato in Brevo
   - Vai su **Settings** > **Senders & IP** > **Domains**
   - Verifica che il dominio sia verificato

3. **Client email non supporta**
   - Non tutti i client email supportano immagini profilo personalizzate
   - Gmail, Outlook, Apple Mail supportano questa funzionalità
   - Client più vecchi potrebbero non mostrare l'immagine

4. **Impostazioni privacy**
   - Alcuni client email bloccano le immagini profilo per privacy
   - L'utente potrebbe aver disabilitato la visualizzazione delle immagini

## 📝 Note Importanti

- L'immagine profilo è associata all'**indirizzo email del mittente**, non al template
- Se usi più indirizzi email come mittenti, devi configurare l'immagine per ciascuno
- L'immagine profilo viene mostrata dai client email che supportano questa funzionalità
- Non tutti i client email mostrano le immagini profilo (dipende dal supporto)

## 🔗 Link Utili

- [Documentazione Brevo - Senders](https://help.brevo.com/hc/en-us/articles/209467485)
- [Gmail Profile Pictures](https://support.google.com/mail/answer/8151)
- [Outlook Profile Pictures](https://support.microsoft.com/en-us/office)

## 💡 Suggerimenti

1. **Usa un'immagine chiara e riconoscibile**
   - Logo aziendale o icona distintiva
   - Evita immagini troppo complesse o con molti dettagli

2. **Testa su diversi client email**
   - Gmail, Outlook, Apple Mail, ecc.
   - Verifica che l'immagine appaia correttamente

3. **Mantieni dimensioni ottimali**
   - 200x200px è un buon compromesso tra qualità e dimensione file
   - Evita immagini troppo grandi (lente da caricare)

4. **Usa lo stesso logo/immagine ovunque**
   - Coerenza con il branding
   - Riconoscibilità immediata

