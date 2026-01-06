# Test Frontend - Sistema Disponibilità

## ✅ Backend Tests Completati
- [x] Tabella `availability_slot` creata
- [x] Campi `active` e `cutoff_hours` aggiunti
- [x] Trigger per aggiornamento contatori funzionanti
- [x] Funzione `is_slot_available` funzionante
- [x] RLS policies configurate
- [x] 4 availability slots creati (2 con time slots, 2 full-day)
- [x] 15 prodotti attivi

---

## 🧪 Test Provider Portal (Admin)

### 1. Accesso e Navigazione
- [ ] Accedi come admin al Provider Portal
- [ ] Vai alla sezione "Prodotti"
- [ ] Verifica che la lista prodotti sia visibile

### 2. Creazione/Modifica Prodotto
- [ ] Clicca su "Nuovo Prodotto" o modifica un prodotto esistente
- [ ] Verifica che ci siano 2 tab: "Informazioni" e "Disponibilità"
- [ ] Compila il form "Informazioni" e salva
- [ ] Verifica che dopo il salvataggio il tab "Disponibilità" sia abilitato

### 3. Gestione Disponibilità - Experiences/Classes
- [ ] Apri il tab "Disponibilità"
- [ ] Verifica sezione "Impostazioni Prodotto":
  - [ ] Toggle "Prodotto Attivo" funziona
  - [ ] Campo "Cutoff Time (ore)" funziona
  - [ ] Campi "Orario Inizio/Fine Giornata Intera" funzionano
- [ ] Aggiungi una data disponibile
- [ ] Verifica che la data sia stata aggiunta alla lista
- [ ] Aggiungi time slots per quella data:
  - [ ] Pulsante "Aggiungi Slot" funziona
  - [ ] Puoi inserire start time, end time, max adults, max dogs
  - [ ] Puoi rimuovere slot
- [ ] Crea uno slot full-day (senza time slots)
- [ ] Clicca "Salva Disponibilità"
- [ ] Verifica messaggio di successo
- [ ] Ricarica la pagina e verifica che le disponibilità siano salvate

### 4. Gestione Disponibilità - Trips
- [ ] Crea/modifica un Trip
- [ ] Apri il tab "Disponibilità"
- [ ] Verifica che per i Trips ci siano solo:
  - [ ] Data Inizio
  - [ ] Data Fine
  - [ ] Max Adulti
  - [ ] Max Cani
- [ ] Imposta date e capacità
- [ ] Salva disponibilità
- [ ] Verifica che sia salvata correttamente

### 5. Verifica Contatori
- [ ] Crea un booking manualmente (se possibile) o verifica che i contatori siano corretti
- [ ] Verifica che `booked_adults` e `booked_dogs` siano inizializzati a 0

---

## 🛒 Test E-commerce (Customer Website)

### 1. Visualizzazione Prodotti
- [ ] Vai all'E-commerce homepage
- [ ] Verifica che solo i prodotti con `active = true` siano visibili
- [ ] Verifica che i prodotti con `active = false` NON siano visibili

### 2. Pagina Prodotto - Disponibilità
- [ ] Apri la pagina di un prodotto (Experience/Class)
- [ ] Verifica che il componente `AvailabilitySelector` sia visibile
- [ ] Verifica che mostri solo date disponibili (future, con capacità disponibile)
- [ ] Verifica che mostri "Sold out" se il prodotto è esaurito
- [ ] Verifica che mostri "Sold out" se il prodotto è disattivato (`active = false`)

### 3. Selezione Disponibilità - Experiences/Classes
- [ ] Se ci sono più date disponibili, verifica che siano tutte visibili
- [ ] Se ci sono time slots per una data:
  - [ ] Verifica che siano tutti visibili
  - [ ] Clicca su uno slot e verifica che si selezioni
  - [ ] Verifica che gli slot esauriti non siano selezionabili
- [ ] Se c'è solo una data con un solo slot:
  - [ ] Verifica che NON venga mostrato il calendario
  - [ ] Verifica che venga mostrata solo la data e l'orario

### 4. Selezione Disponibilità - Trips
- [ ] Apri la pagina di un Trip
- [ ] Verifica che mostri solo la data di inizio (con range se disponibile)
- [ ] Verifica che mostri correttamente il formato "Lunedì 1 Gennaio - 5 Gennaio"
- [ ] Seleziona una data e verifica che funzioni

### 5. Cutoff Time
- [ ] Crea uno slot molto vicino (es. tra 1 ora) con cutoff_hours = 24
- [ ] Verifica che quello slot NON sia disponibile nell'E-commerce
- [ ] Verifica che gli slot oltre il cutoff time siano disponibili

### 6. Booking Flow
- [ ] Seleziona una data/slot disponibile
- [ ] Seleziona numero di persone e cani
- [ ] Clicca "Prenota Ora"
- [ ] Verifica che l'URL di checkout contenga:
  - `availabilitySlotId`
  - `date`
  - `timeSlot` (se presente)
  - `guests` e `dogs`

---

## 🔍 Test Edge Cases

### 1. Prodotti senza Disponibilità
- [ ] Crea un prodotto senza impostare disponibilità
- [ ] Verifica che nell'E-commerce mostri "Nessuna disponibilità al momento"

### 2. Slot Esauriti
- [ ] Crea uno slot con `booked_adults = max_adults`
- [ ] Verifica che nell'E-commerce quello slot NON sia disponibile
- [ ] Verifica che il prodotto mostri "Sold out" se tutti gli slot sono esauriti

### 3. Date Passate
- [ ] Verifica che le date nel passato NON siano visibili
- [ ] Verifica che solo date future siano disponibili

### 4. Validazioni
- [ ] Prova a creare uno slot con data nel passato → dovrebbe essere bloccato
- [ ] Prova a creare uno slot con `booked > max` → dovrebbe essere bloccato

---

## 📝 Note per i Test

1. **Provider Portal URL**: Verifica l'URL del tuo Provider Portal deployato
2. **E-commerce URL**: Verifica l'URL del tuo E-commerce deployato
3. **Admin Account**: Assicurati di avere accesso come admin
4. **Test Data**: Usa i prodotti di test già creati (5 experiences, 5 classes, 5 trips)

---

## ✅ Checklist Completamento

Dopo aver completato tutti i test:
- [ ] Tutti i test Provider Portal passati
- [ ] Tutti i test E-commerce passati
- [ ] Tutti i test Edge Cases passati
- [ ] Nessun errore nella console del browser
- [ ] Nessun errore nei log di Supabase

---

## 🐛 Se Trovi Errori

1. Controlla la console del browser (F12)
2. Controlla i log di Supabase Dashboard
3. Verifica che le migration siano state applicate correttamente
4. Verifica che le variabili d'ambiente siano configurate correttamente




