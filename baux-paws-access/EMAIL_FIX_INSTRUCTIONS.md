# Fix Email - Istruzioni

## Fix Applicati

### 1. Cognome Duplicato ✅
**Problema**: "Ciao Alessandro Dezzani Dezzani"
**Causa**: `customerName` conteneva già nome completo, e veniva aggiunto anche `customerSurname`
**Fix**: Estraggo solo il nome (prima parola) da `customerName` quando `customerSurname` è presente

### 2. Prezzo Troppo Grande ✅
**Problema**: Font-size 28px troppo grande
**Fix**: Ridotto a 22px

## Aggiornamento Template Brevo

**IMPORTANTE**: Devi aggiornare il template su Brevo con il nuovo HTML.

1. Vai su Brevo Dashboard → Templates → "Order confirmation" (ID: 2)
2. Copia il contenuto di `BREVO_EMAIL_TEMPLATE_FINAL.html`
3. Incolla nel template HTML
4. Salva

### Cambiamenti nel Template:
- **Riga 147**: `font-size: 28px` → `font-size: 22px` (CSS)
- **Riga 297**: `font-size: 28px` → `font-size: 22px` (inline style)

## Test

Dopo l'aggiornamento:
1. Completa un nuovo pagamento di test
2. Verifica che l'email mostri: "Ciao Alessandro Dezzani" (non duplicato)
3. Verifica che il prezzo sia più piccolo (22px invece di 28px)

## Note

La funzione `send-transactional-email` è già deployata con il fix per il cognome.
Solo il template HTML su Brevo deve essere aggiornato manualmente.




