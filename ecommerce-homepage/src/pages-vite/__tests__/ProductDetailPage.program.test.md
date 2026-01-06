# Test Manuali per Sezioni Programma Collassabili

## ✅ Test da Eseguire Manualmente

### Test 1: Rendering Base
- [ ] La pagina prodotto si carica senza errori
- [ ] La sezione "Programma" è visibile quando il prodotto ha un programma
- [ ] I titoli dei giorni sono visibili (es. "Giorno 1 - venerdì 19 dicembre 2025")

### Test 2: Stato Collassato Iniziale
- [ ] I giorni sono inizialmente collassati (solo titolo visibile)
- [ ] Le attività NON sono visibili inizialmente
- [ ] Le introduzioni NON sono visibili inizialmente
- [ ] Le icone ChevronDown sono visibili accanto ai titoli

### Test 3: Espansione Sezione
- [ ] Click sul titolo di un giorno espande la sezione
- [ ] Dopo il click, le attività diventano visibili
- [ ] Dopo il click, l'introduzione diventa visibile (se presente)
- [ ] L'icona cambia da ChevronDown a ChevronUp

### Test 4: Collasso Sezione
- [ ] Click su un giorno già espanso lo collassa
- [ ] Dopo il click, le attività scompaiono
- [ ] Dopo il click, l'introduzione scompare
- [ ] L'icona cambia da ChevronUp a ChevronDown

### Test 5: Indipendenza delle Sezioni
- [ ] Espandere un giorno non espande gli altri
- [ ] È possibile avere più giorni espansi contemporaneamente
- [ ] Collassare un giorno non influisce sugli altri

### Test 6: Prodotti senza Programma
- [ ] Prodotti senza programma non mostrano la sezione "Programma"
- [ ] La pagina non si rompe se program è null o undefined
- [ ] La pagina non si rompe se program.days è vuoto

### Test 7: Edge Cases
- [ ] Giorno senza introduzione funziona correttamente
- [ ] Giorno senza attività funziona correttamente
- [ ] Giorno con molte attività (10+) funziona correttamente
- [ ] Viaggi con molti giorni (5+) funzionano correttamente

### Test 8: Responsive Design
- [ ] Su mobile, le sezioni funzionano correttamente
- [ ] Su tablet, le sezioni funzionano correttamente
- [ ] Su desktop, le sezioni funzionano correttamente
- [ ] I bullet points sono visibili su tutti i dispositivi

### Test 9: Performance
- [ ] Click su sezioni è reattivo (nessun lag)
- [ ] Espansione/collasso è fluido
- [ ] Nessun errore nella console del browser

## 🐛 Problemi Comuni da Verificare

1. **Errore: "expandedDays is not defined"**
   - ✅ Fix: Aggiunto `useState<Set<string>>(new Set())` per expandedDays

2. **Sezioni sempre aperte**
   - Verificare che `isExpanded` sia inizialmente `false`
   - Verificare che il contenuto sia dentro `{isExpanded && ...}`

3. **Click non funziona**
   - Verificare che il button abbia `onClick={toggleDay}`
   - Verificare che `toggleDay` sia definito correttamente

4. **Icone non cambiano**
   - Verificare che `isExpanded` sia calcolato correttamente
   - Verificare che `dayKey` sia unico per ogni giorno

## 📝 Note

- I test automatici sono in `ProductDetailPage.test.tsx` ma richiedono configurazione vitest
- Questi test manuali possono essere eseguiti immediatamente
- Segnare con ✅ quando completati

