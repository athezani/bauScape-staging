# Istruzioni per Aggiornare il Template Email in Brevo

## Panoramica
Questo documento descrive come aggiornare il template email di conferma prenotazione in Brevo con le nuove informazioni richieste.

## Nuove Sezioni Aggiunte

Le seguenti sezioni sono state aggiunte all'email nell'ordine specificato:

1. **Cosa è incluso** - Lista con segni di spunta gialli (✓)
2. **Cosa non è incluso** - Lista con X rosse (✗)
3. **Orario e Punto di Incontro** - Testo + link Google Maps
4. **Programma** - Programma dettagliato (solo per viaggi)
5. **Regolamento a 6 Zampe** - Link al regolamento
6. **Policy di Cancellazione** - Testo della policy

## File Template

Il template HTML completo è disponibile in: `baux-paws-access/EMAIL_TEMPLATE_UPDATED.html`

## Parametri Brevo Utilizzati

Tutti i parametri sono già configurati nel backend. Ecco i parametri utilizzati:

### Parametri Esistenti (già in uso)
- `{{ params.CUSTOMER_NAME }}`
- `{{ params.CUSTOMER_SURNAME }}`
- `{{ params.ORDER_NUMBER }}`
- `{{ params.PRODUCT_NAME }}`
- `{{ params.PRODUCT_TYPE }}`
- `{{ params.PRODUCT_DESCRIPTION }}`
- `{{ params.PRODUCT_DESCRIPTION_DISPLAY }}`
- `{{ params.BOOKING_DATE }}`
- `{{ params.BOOKING_TIME }}`
- `{{ params.BOOKING_TIME_DISPLAY }}`
- `{{ params.NUMBER_OF_ADULTS }}`
- `{{ params.NUMBER_OF_ADULTS_DISPLAY }}`
- `{{ params.NUMBER_OF_DOGS }}`
- `{{ params.NUMBER_OF_DOGS_DISPLAY }}`
- `{{ params.TOTAL_AMOUNT }}`
- `{{ params.BOOKING_ID }}`

### Nuovi Parametri
- `{{ params.INCLUDED_ITEMS }}` - HTML formattato con lista e checkmarks
- `{{ params.INCLUDED_ITEMS_DISPLAY }}` - 'block' o 'none'
- `{{ params.EXCLUDED_ITEMS }}` - HTML formattato con lista e X rosse
- `{{ params.EXCLUDED_ITEMS_DISPLAY }}` - 'block' o 'none'
- `{{ params.MEETING_INFO_TEXT }}` - Testo orario e punto di incontro
- `{{ params.MEETING_INFO_LINK }}` - Link Google Maps
- `{{ params.MEETING_INFO_DISPLAY }}` - 'block' o 'none'
- `{{ params.PROGRAM }}` - HTML formattato del programma
- `{{ params.PROGRAM_DISPLAY }}` - 'block' o 'none'
- `{{ params.REGOLAMENTO_LINK }}` - Link al regolamento
- `{{ params.CANCELLATION_POLICY }}` - Testo della policy
- `{{ params.CANCELLATION_POLICY_DISPLAY }}` - 'block' o 'none'

## Note Importanti

1. **Display Conditionals**: Tutte le nuove sezioni utilizzano `display: {{ params.XXX_DISPLAY }}` per mostrare/nascondere condizionalmente il contenuto.

2. **Formattazione HTML**: 
   - `INCLUDED_ITEMS` e `EXCLUDED_ITEMS` sono già formattati come `<li>` con stili inline
   - `PROGRAM` è già formattato come HTML completo con stili inline
   - Tutti i testi sono già escapati per sicurezza

3. **Responsive Design**: Il template è già responsive e supporta dark mode.

4. **Ordine delle Sezioni**: Le nuove sezioni devono essere inserite DOPO "Dettagli Prenotazione" e PRIMA di "Cosa succede ora?".

## Passi per Aggiornare Brevo

1. Accedi a Brevo e vai alla sezione Templates
2. Apri il template di conferma prenotazione (Template ID 2 o quello configurato)
3. Copia il contenuto da `EMAIL_TEMPLATE_UPDATED.html`
4. Incolla nel template HTML in Brevo
5. Salva il template
6. Testa l'invio di una email di prova

## Test

Dopo l'aggiornamento, testa l'email con:
- Un prodotto con tutti i campi compilati
- Un prodotto con solo alcuni campi compilati
- Verifica che le sezioni si nascondano correttamente quando i dati non sono disponibili

