# 🔍 Safety Check Prima di Eliminare `ecommerce-homepage`

## ⚠️ ATTENZIONE: Eliminazione Irreversibile

Prima di eliminare `ecommerce-homepage`, verifica TUTTO questo:

---

## ✅ Checklist Pre-Eliminazione

### 1. Verifica Domini Custom

**CRITICO**: Se `ecommerce-homepage` ha domini custom collegati, NON eliminarlo!

**Come verificare:**
1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. Settings → **Domains**
3. Controlla se ci sono domini custom (es. `example.com`, `www.example.com`)
4. Se ci sono domini → ❌ **NON ELIMINARE** (prima sposta i domini a `bauscape`)

**Domini da verificare:**
- [ ] Nessun dominio custom collegato
- [ ] Solo dominio Vercel default (`ecommerce-homepage-*.vercel.app`)

---

### 2. Verifica Deploy Attivi

**Controlla se ci sono deploy recenti o attivi:**

1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. **Deployments** tab
3. Controlla:
   - [ ] Ultimo deploy è vecchio (più di qualche giorno)
   - [ ] Non ci sono deploy attivi in corso
   - [ ] Nessun deploy di produzione recente

**Se ci sono deploy recenti di produzione:**
- ⚠️ Verifica che `bauscape` sia effettivamente identico e funzionante
- ⚠️ Potrebbe essere che `ecommerce-homepage` sia ancora in uso

---

### 3. Verifica Variabili d'Ambiente

**Controlla se ha variabili d'ambiente importanti:**

1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. Settings → **Environment Variables**
3. Controlla:
   - [ ] Le variabili sono duplicate in `bauscape`?
   - [ ] Ci sono variabili uniche che non esistono in `bauscape`?
   - [ ] Le variabili sono importanti per produzione?

**Se ci sono variabili uniche:**
- ⚠️ Copiale in `bauscape` prima di eliminare
- ⚠️ Verifica che `bauscape` abbia tutte le variabili necessarie

---

### 4. Verifica Integrazioni

**Controlla se è collegato a servizi esterni:**

1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. Settings → **Integrations**
3. Controlla:
   - [ ] GitHub integration (dovrebbe essere lo stesso repo)
   - [ ] Altri servizi collegati

---

### 5. Verifica che `bauscape` sia Identico

**CRITICO**: Assicurati che `bauscape` faccia esattamente la stessa cosa:

1. Vai su Vercel Dashboard → `bauscape`
2. Verifica:
   - [ ] Root Directory = `ecommerce-homepage` ✅
   - [ ] Framework = Next.js ✅
   - [ ] Branch Production = `main` ✅
   - [ ] Ha tutte le variabili d'ambiente necessarie
   - [ ] Ha domini custom se necessario (es. `flixdog.com`)

3. **Test Funzionale:**
   - [ ] Visita `bauscape` URL (o dominio custom)
   - [ ] Verifica che funzioni correttamente
   - [ ] Confronta con `ecommerce-homepage` (se ancora accessibile)
   - [ ] Verifica che siano identici

---

### 6. Verifica URL e Accessi

**Controlla se qualcuno usa ancora `ecommerce-homepage`:**

1. Controlla se ci sono link esterni che puntano a:
   - `ecommerce-homepage-*.vercel.app`
   - Altri URL del progetto

2. Controlla:
   - [ ] Nessun servizio esterno che usa questo URL
   - [ ] Nessun webhook che punta a questo progetto
   - [ ] Nessun servizio di monitoraggio collegato

---

### 7. Backup delle Configurazioni

**Prima di eliminare, salva le configurazioni:**

1. Screenshot di:
   - [ ] Settings → General (Root Directory, Framework, etc.)
   - [ ] Settings → Environment Variables (lista completa)
   - [ ] Settings → Domains (se presenti)
   - [ ] Deployments (ultimi deploy)

2. Export variabili d'ambiente (se necessario):
   - [ ] Copia tutte le variabili in un file di testo
   - [ ] Verifica che siano in `bauscape`

---

## 🎯 Decisione Finale

### ✅ SICURO eliminare se:

- [x] Nessun dominio custom collegato
- [x] Solo dominio Vercel default
- [x] Ultimo deploy è vecchio
- [x] `bauscape` è identico e funzionante
- [x] Tutte le variabili d'ambiente sono in `bauscape`
- [x] Nessun servizio esterno usa questo progetto
- [x] Hai fatto backup delle configurazioni

### ❌ NON eliminare se:

- [ ] Ha domini custom collegati
- [ ] Ha deploy recenti di produzione
- [ ] Ha variabili d'ambiente uniche non in `bauscape`
- [ ] È ancora in uso da servizi esterni
- [ ] `bauscape` non è identico/funzionante

---

## 📋 Procedura Sicura

### Step 1: Verifica Completa
1. Controlla tutti i punti della checklist sopra
2. Documenta tutto
3. Fai screenshot delle configurazioni

### Step 2: Test `bauscape`
1. Verifica che `bauscape` funzioni perfettamente
2. Testa tutte le funzionalità
3. Confronta con `ecommerce-homepage` (se possibile)

### Step 3: Backup
1. Salva tutte le configurazioni
2. Copia variabili d'ambiente in `bauscape` se mancanti

### Step 4: Eliminazione (Solo se tutto OK)
1. Vai su Vercel Dashboard → `ecommerce-homepage`
2. Settings → General → Scroll in basso
3. "Delete Project"
4. Conferma

### Step 5: Verifica Post-Eliminazione
1. Verifica che `bauscape` funzioni ancora
2. Testa che tutto sia OK
3. Monitora per qualche giorno

---

## 🆘 Piano di Rollback

Se qualcosa va storto dopo l'eliminazione:

1. **Non puoi recuperare il progetto eliminato**
2. **Puoi ricreare il progetto** con le stesse configurazioni:
   - Crea nuovo progetto
   - Imposta Root Directory = `ecommerce-homepage`
   - Aggiungi variabili d'ambiente (dal backup)
   - Collega domini (se presenti)

---

## 💡 Raccomandazione

**Opzione 1: Eliminazione Immediata** (se tutto OK)
- Procedi con eliminazione se tutti i check sono OK

**Opzione 2: Eliminazione Dopo Test** (più sicuro)
- Lascia `ecommerce-homepage` per qualche giorno
- Monitora che `bauscape` funzioni perfettamente
- Elimina dopo aver verificato che tutto è OK

**Opzione 3: Non Eliminare** (più conservativo)
- Lascia `ecommerce-homepage` come backup
- Non costa nulla tenerlo
- Puoi eliminarlo in futuro quando sei sicuro

---

## 📝 Checklist Finale Prima di Eliminare

- [ ] ✅ Nessun dominio custom
- [ ] ✅ Ultimo deploy vecchio
- [ ] ✅ `bauscape` funziona perfettamente
- [ ] ✅ Tutte le variabili sono in `bauscape`
- [ ] ✅ Backup fatto
- [ ] ✅ Test completato
- [ ] ✅ Pronto a eliminare

**Solo se TUTTI i check sono ✅, procedi con l'eliminazione.**

