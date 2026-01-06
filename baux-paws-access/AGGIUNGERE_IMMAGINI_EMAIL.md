# Come Aggiungere Immagini alle Email di Conferma Prenotazione

Questa guida spiega come aggiungere immagini (logo, foto prodotto, ecc.) alle email che i clienti ricevono dopo una prenotazione.

## 📍 Dove Aggiungere le Immagini

Le immagini vanno aggiunte **direttamente nel template Brevo**, non nel codice. Ci sono due modi:

### Metodo 1: Upload Immagine su Brevo (Consigliato)

Questo è il metodo più semplice e affidabile.

#### Passaggi:

1. **Prepara l'immagine**
   - Formato consigliato: PNG o JPG
   - Dimensione consigliata per logo: max 200px di larghezza
   - Dimensione consigliata per immagini prodotto: max 600px di larghezza
   - Peso: max 500KB (meglio se < 200KB)

2. **Accedi a Brevo Dashboard**
   - Vai su: https://app.brevo.com
   - Accedi al tuo account

3. **Vai ai Template**
   - Clicca su **Email** > **Transazionale** > **Modelli**
   - Trova il template "Order confirmation" (Template ID 2 o 3)
   - Clicca su **Modifica**

4. **Aggiungi l'Immagine**
   - Nel editor del template, clicca sul pulsante **Immagine** o **Image** nella toolbar
   - Scegli **Carica immagine** o **Upload image**
   - Seleziona il file immagine dal tuo computer
   - Brevo caricherà l'immagine e genererà automaticamente l'URL

5. **Posiziona l'Immagine**
   - Posiziona l'immagine dove vuoi (es. in alto come logo, o nel corpo dell'email)
   - Puoi ridimensionarla trascinando gli angoli
   - Per un logo in alto, posizionalo all'inizio del template, prima del testo

6. **Salva il Template**
   - Clicca su **Salva** o **Save**
   - L'immagine sarà ora visibile in tutte le email inviate

### Metodo 2: Usare URL Esterno

Se preferisci hostare l'immagine su un server esterno (es. CDN, Vercel, ecc.):

1. **Carica l'immagine su un server**
   - Carica l'immagine su un server accessibile pubblicamente
   - Ottieni l'URL completo (es: `https://tuodominio.com/images/logo.png`)

2. **Aggiungi nel Template Brevo**
   - Apri il template in Brevo
   - Clicca su **Immagine** nella toolbar
   - Scegli **Inserisci URL** o **Insert URL**
   - Incolla l'URL dell'immagine
   - Salva

**⚠️ Nota:** Assicurati che l'URL sia sempre accessibile. Se l'immagine viene spostata o eliminata, non apparirà più nelle email.

## 🎨 Esempi di Posizionamento

### Logo in Header

Posiziona il logo all'inizio dell'email, prima del saluto:

```html
<div class="header" style="text-align: center; padding: 20px;">
    <img src="URL_IMMAGINE_QUI" alt="FlixDog Logo" style="max-width: 180px; height: auto;">
</div>
```

### Immagine Prodotto

Se vuoi mostrare un'immagine del prodotto prenotato, aggiungila nella sezione dettagli:

```html
<div style="text-align: center; margin: 20px 0;">
    <img src="URL_IMMAGINE_PRODOTTO" alt="{{ params.PRODUCT_NAME }}" style="max-width: 400px; height: auto; border-radius: 8px;">
</div>
```

## 🔧 Aggiungere Immagine Dinamica (Avanzato)

Se vuoi passare l'URL dell'immagine come parametro dinamico dal codice:

### 1. Modifica il Codice TypeScript

Aggiungi un nuovo parametro nell'interfaccia `BrevoEmailParams`:

```typescript
// In send-transactional-email/index.ts
interface BrevoEmailParams {
  // ... parametri esistenti ...
  LOGO_URL?: string;  // URL del logo
  PRODUCT_IMAGE_URL?: string;  // URL immagine prodotto
}
```

Poi aggiungi il parametro quando prepari l'email:

```typescript
emailParams = {
  // ... parametri esistenti ...
  LOGO_URL: 'https://tuodominio.com/images/logo.png',
  PRODUCT_IMAGE_URL: productImageUrl || '', // se hai l'URL dell'immagine prodotto
};
```

### 2. Usa nel Template Brevo

Nel template HTML, usa il placeholder:

```html
<img src="{{ params.LOGO_URL }}" alt="Logo" style="max-width: 180px; height: auto;">
```

## 📝 Template Attuali

I template attuali sono:
- **Template ID 2**: Per prodotti normali (con sezione "Partecipanti")
- **Template ID 3**: Per prodotti senza adulti (no_adults = true)

Devi aggiungere l'immagine in **entrambi i template** se vuoi che appaia in tutte le email.

## ✅ Best Practices

1. **Ottimizza le immagini**
   - Usa formati compressi (JPG per foto, PNG per logo con trasparenza)
   - Riduci le dimensioni prima di caricarle
   - Usa tool come TinyPNG o ImageOptim

2. **Testa su diversi client email**
   - Gmail, Outlook, Apple Mail, ecc. gestiscono le immagini in modo diverso
   - Testa sempre prima di andare in produzione

3. **Usa alt text**
   - Aggiungi sempre un attributo `alt` alle immagini per accessibilità
   - Es: `<img src="..." alt="FlixDog Logo">`

4. **Considera il responsive**
   - Le email vengono aperte anche su mobile
   - Usa `max-width: 100%` e `height: auto` per immagini responsive

## 🐛 Troubleshooting

### L'immagine non appare

1. **Verifica l'URL**
   - Assicurati che l'URL sia accessibile pubblicamente
   - Prova ad aprire l'URL direttamente nel browser

2. **Verifica il formato**
   - Alcuni client email bloccano immagini esterne
   - Usa il metodo 1 (upload su Brevo) per evitare questo problema

3. **Controlla i log**
   - Verifica i log di Brevo per errori di caricamento

### L'immagine è troppo grande/piccola

- Modifica le dimensioni nel template Brevo
- Oppure modifica l'immagine originale e ricaricala

## 📚 Risorse Utili

- [Documentazione Brevo - Template](https://help.brevo.com/hc/en-us/articles/209467485)
- [Guida Email HTML](https://www.campaignmonitor.com/dev-resources/guides/coding/)
- [Test Email Responsive](https://www.emailonacid.com/)

