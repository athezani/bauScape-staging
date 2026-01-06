# 📧 Aggiornamento Email di Conferma: Nuovi Campi

## ✅ Modifiche Completate

Sono stati aggiunti i seguenti campi alla mail di conferma di prenotazione, nell'ordine richiesto:

1. **Cosa è incluso** (`included_items`)
2. **Cosa non è incluso** (`excluded_items`)
3. **Orario e punto di incontro** (`meeting_info` + `show_meeting_info`)
4. **Programma** (`program`)
5. **Link e riferimento al regolamento a 6 zampe** (`REGOLAMENTO_LINK`)
6. **Policy di cancellazione** (`cancellation_policy`)

## 📋 File Modificati

### 1. `send-transactional-email/index.ts`
- ✅ Aggiunti nuovi campi a `EmailRequest` interface
- ✅ Aggiunti nuovi campi a `BrevoEmailParams` interface
- ✅ Aggiunte funzioni di formattazione:
  - `formatIncludedItems()` - Formatta lista "cosa è incluso" come HTML
  - `formatExcludedItems()` - Formatta lista "cosa non è incluso" come HTML
  - `formatProgram()` - Formatta programma come HTML
  - `escapeHtml()` - Escape caratteri HTML speciali
- ✅ Aggiunti parametri Brevo per tutti i nuovi campi
- ✅ Link regolamento: `https://flixdog.com/regolamento-a-6-zampe`

### 2. `stripe-webhook-odoo/route.ts`
- ✅ Recupero dati prodotto esteso per includere:
  - `included_items`
  - `excluded_items`
  - `meeting_info`
  - `show_meeting_info`
  - `cancellation_policy`
- ✅ Recupero programma da `trip_program_day` e `trip_program_item`
- ✅ Passaggio di tutti i nuovi campi all'email payload

### 3. `create-booking/index.ts`
- ✅ Esteso `selectFields` per includere nuovi campi prodotto
- ✅ Recupero programma
- ✅ Passaggio di tutti i nuovi campi all'email payload

### 4. `ensure-booking/index.ts`
- ✅ Esteso recupero dati prodotto per includere nuovi campi
- ✅ Recupero programma
- ✅ Passaggio di tutti i nuovi campi all'email payload

## 📊 Parametri Brevo Disponibili

Tutti questi parametri sono ora disponibili nel template Brevo:

### Campi Esistenti (già presenti)
- `CUSTOMER_NAME`
- `CUSTOMER_SURNAME`
- `PRODUCT_NAME`
- `PRODUCT_DESCRIPTION`
- `PRODUCT_TYPE`
- `BOOKING_DATE`
- `BOOKING_TIME`
- `NUMBER_OF_ADULTS`
- `NUMBER_OF_DOGS`
- `TOTAL_AMOUNT`
- `CURRENCY`
- `ORDER_NUMBER`
- `BOOKING_ID`

### Nuovi Campi (aggiunti)
- `INCLUDED_ITEMS` - HTML formattato (lista `<li>`)
- `INCLUDED_ITEMS_DISPLAY` - 'block' o 'none' per controllo visualizzazione
- `EXCLUDED_ITEMS` - HTML formattato (lista `<li>`)
- `EXCLUDED_ITEMS_DISPLAY` - 'block' o 'none' per controllo visualizzazione
- `MEETING_INFO_TEXT` - Testo orario e punto di incontro
- `MEETING_INFO_LINK` - Link Google Maps
- `MEETING_INFO_DISPLAY` - 'block' o 'none' (solo se `show_meeting_info` è true)
- `PROGRAM` - HTML formattato del programma
- `PROGRAM_DISPLAY` - 'block' o 'none' per controllo visualizzazione
- `REGOLAMENTO_LINK` - Link al regolamento: `https://flixdog.com/regolamento-a-6-zampe`
- `CANCELLATION_POLICY` - Testo policy di cancellazione
- `CANCELLATION_POLICY_DISPLAY` - 'block' o 'none' per controllo visualizzazione

## 🎨 Formattazione Dati

### Included Items
```html
<li>Item incluso 1</li>
<li>Item incluso 2</li>
```

### Excluded Items
```html
<li>Item NON incluso 1</li>
<li>Item NON incluso 2</li>
```

### Program
```html
<div style="margin-bottom: 20px;">
  <h3 style="font-weight: bold; margin-bottom: 10px;">Giorno 1</h3>
  <p style="margin-bottom: 10px;">Introduzione...</p>
  <ul style="margin-left: 20px; margin-bottom: 10px;">
    <li>Attività 1</li>
    <li>Attività 2</li>
  </ul>
</div>
```

### Meeting Info
- `MEETING_INFO_TEXT`: Testo formattato
- `MEETING_INFO_LINK`: Link Google Maps completo
- Visualizzato solo se `show_meeting_info` è `true`

## 📝 Ordine di Visualizzazione (come richiesto)

1. Cosa è incluso (`INCLUDED_ITEMS`)
2. Cosa non è incluso (`EXCLUDED_ITEMS`)
3. Orario e punto di incontro (`MEETING_INFO_TEXT` + `MEETING_INFO_LINK`)
4. Programma (`PROGRAM`)
5. Link regolamento (`REGOLAMENTO_LINK`)
6. Policy di cancellazione (`CANCELLATION_POLICY`)

## ✅ Pronto per Template Brevo

Tutti i dati sono ora disponibili per Brevo. Il prossimo passo è aggiornare il template Brevo per utilizzare questi nuovi parametri nel design della mail.

## 🔄 Prossimi Passi

1. ✅ Dati disponibili per Brevo (completato)
2. ⏳ Aggiornare template Brevo con design (da fare)
3. ⏳ Test invio email con nuovi campi (da fare)

