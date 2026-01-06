# Istruzioni per Inserire il Template Email in Brevo

## Template ID: 2

## Passaggi

1. **Accedi a Brevo Dashboard**
   - Vai su https://app.brevo.com
   - Accedi al tuo account

2. **Vai alla Sezione Template**
   - Clicca su **Email** > **Transazionale** > **Modelli**
   - Trova il template "Order confirmation" (ID: 2)
   - Oppure crea un nuovo template e assegna l'ID 2

3. **Copia il Codice HTML**
   - Apri il file `BREVO_EMAIL_TEMPLATE_FINAL.html`
   - Copia tutto il contenuto (Ctrl+A, Ctrl+C)

4. **Incolla in Brevo**
   - In Brevo, clicca su **Modifica** sul template
   - Seleziona la modalità **HTML** (non drag & drop)
   - Incolla il codice HTML copiato
   - Salva il template

## Placeholder da Configurare

Assicurati che questi placeholder siano configurati nel template Brevo:

- `{{ params.CUSTOMER_NAME }}` - Nome del cliente
- `{{ params.CUSTOMER_SURNAME }}` - Cognome del cliente (può essere vuoto)
- `{{ params.PRODUCT_NAME }}` - Nome del prodotto
- `{{ params.PRODUCT_DESCRIPTION }}` - Descrizione prodotto (HTML, può essere vuoto)
- `{{ params.PRODUCT_TYPE }}` - Tipo prodotto (Esperienza/Classe/Viaggio)
- `{{ params.BOOKING_DATE }}` - Data prenotazione (formattata in italiano)
- `{{ params.BOOKING_TIME }}` - Orario prenotazione (HTML, può essere vuoto)
- `{{ params.NUMBER_OF_ADULTS }}` - Numero adulti (formattato come "2 persone")
- `{{ params.NUMBER_OF_DOGS }}` - Numero cani (HTML, può essere vuoto)
- `{{ params.TOTAL_AMOUNT }}` - Importo totale (es: "€50.00")
- `{{ params.CURRENCY }}` - Valuta (EUR)
- `{{ params.ORDER_NUMBER }}` - Numero ordine
- `{{ params.BOOKING_ID }}` - ID prenotazione

## Note Importanti

1. **Triple Braces per HTML**: I placeholder `{{{ }}}` (triple braces) sono usati per i campi che contengono HTML (PRODUCT_DESCRIPTION, BOOKING_TIME, NUMBER_OF_DOGS). Questo permette a Brevo di renderizzare l'HTML invece di mostrarlo come testo.

2. **Campi Opzionali**: I campi opzionali (CUSTOMER_SURNAME, PRODUCT_DESCRIPTION, BOOKING_TIME, NUMBER_OF_DOGS) vengono gestiti nel codice TypeScript che invia stringhe vuote o HTML vuoto se non presenti.

3. **Test del Template**: Dopo aver inserito il template, puoi testarlo usando la funzione "Test" in Brevo con dati di esempio.

## Verifica

Dopo aver inserito il template:

1. Verifica che tutti i placeholder siano riconosciuti da Brevo
2. Testa il template con dati di esempio
3. Assicurati che il template sia **attivo** e **pubblicato**

## Troubleshooting

- Se i placeholder non vengono riconosciuti, verifica che siano nel formato `{{ params.NOME_VARIABILE }}`
- Se l'HTML non viene renderizzato, usa `{{{ }}}` invece di `{{ }}` per i campi HTML
- Se il template non si salva, verifica che non ci siano errori di sintassi HTML

