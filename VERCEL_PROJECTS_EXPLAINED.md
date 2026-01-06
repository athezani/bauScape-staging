# 📋 Spiegazione Progetti Vercel

## 🏗️ Struttura del Monorepo

Il repository `bauScape` contiene **2 applicazioni separate**:

### 1. `ecommerce-homepage/` - Customer Website
- **Tipo**: Next.js
- **Scopo**: Sito e-commerce pubblico per clienti
- **URL Production**: `flixdog.com` (o simile)
- **Root Directory**: `ecommerce-homepage`
- **Framework**: Next.js

### 2. `baux-paws-access/` - Provider Portal
- **Tipo**: Vite/React
- **Scopo**: Dashboard amministrativo per provider
- **URL Production**: `bauscape.vercel.app` (o simile)
- **Root Directory**: `baux-paws-access`
- **Framework**: Vite

### 3. Root del repository
- **Nota**: Il file `vercel.json` nella root è probabilmente obsoleto o per un setup precedente
- **Non serve** un progetto Vercel separato per la root

---

## ✅ Progetti Vercel Necessari

### Per Produzione (branch `main`)

#### 1. **ecommerce-homepage** (Customer Website)
- **Nome Progetto**: `ecommerce-homepage` o `bau-scape` o simile
- **Root Directory**: `ecommerce-homepage`
- **Framework**: Next.js
- **Branch Production**: `main`
- **URL**: Probabilmente `flixdog.com` o `bau-scape.vercel.app`

**Serve?** ✅ **SÌ** - Questo è il sito pubblico principale

#### 2. **baux-paws-access** (Provider Portal)
- **Nome Progetto**: `bauscape` o `baux-paws-access` o simile
- **Root Directory**: `baux-paws-access`
- **Framework**: Vite
- **Branch Production**: `main`
- **URL**: Probabilmente `bauscape.vercel.app`

**Serve?** ✅ **SÌ** - Questo è il dashboard provider

---

## ❓ Terzo Progetto Vercel

Se vedi un **terzo progetto**, potrebbe essere:

### Opzione A: Progetto Root (Non Serve)
- **Nome**: Potrebbe essere `bauScape` o simile
- **Root Directory**: `/` (root del repository)
- **Serve?** ❌ **NO** - Non serve, è obsoleto
- **Azione**: Puoi eliminarlo o ignorarlo

### Opzione B: Progetto Staging Esistente
- **Nome**: Potrebbe essere `ecommerce-homepage-staging` o simile
- **Root Directory**: `ecommerce-homepage` o `baux-paws-access`
- **Branch**: `staging`
- **Serve?** ✅ **SÌ** - Se vuoi avere staging separato

### Opzione C: Progetto Duplicato/Test
- **Nome**: Variabile
- **Serve?** ❓ **DIPENDE** - Se è un test, puoi eliminarlo

---

## 🔍 Come Identificare i Progetti

Per capire quali progetti hai su Vercel:

1. Vai su: https://vercel.com/dashboard
2. Per ogni progetto, controlla:
   - **Settings** → **General** → **Root Directory**
   - **Settings** → **Git** → **Production Branch**

### Checklist Identificazione

Per ogni progetto, verifica:

- [ ] **Root Directory** = `ecommerce-homepage` → Customer Website ✅
- [ ] **Root Directory** = `baux-paws-access` → Provider Portal ✅
- [ ] **Root Directory** = `/` o vuoto → Root (probabilmente non serve) ❌
- [ ] **Production Branch** = `main` → Produzione
- [ ] **Production Branch** = `staging` → Staging

---

## 📊 Configurazione Consigliata

### Produzione (branch `main`)

1. **ecommerce-homepage** (Customer Website)
   - Root: `ecommerce-homepage`
   - Branch: `main`
   - Environment: Production

2. **baux-paws-access** (Provider Portal)
   - Root: `baux-paws-access`
   - Branch: `main`
   - Environment: Production

### Staging (branch `staging`) - Opzionale

Puoi avere progetti separati per staging OPPURE usare Preview Deployments:

#### Opzione 1: Progetti Separati Staging
1. **ecommerce-homepage-staging**
   - Root: `ecommerce-homepage`
   - Branch: `staging`
   - Environment: Production (ma con variabili staging)

2. **baux-paws-access-staging**
   - Root: `baux-paws-access`
   - Branch: `staging`
   - Environment: Production (ma con variabili staging)

#### Opzione 2: Preview Deployments (Raccomandato)
- Usa i progetti produzione
- Le preview deployments su branch `staging` useranno automaticamente variabili "Preview"
- Più semplice da gestire

---

## 🗑️ Cosa Eliminare

### Elimina se:
- ❌ Progetto con Root Directory = `/` (root repository)
- ❌ Progetto duplicato/test che non usi più
- ❌ Progetto con nome confuso che non corrisponde a nessuna app

### Mantieni:
- ✅ Progetto per `ecommerce-homepage` (produzione)
- ✅ Progetto per `baux-paws-access` (produzione)
- ✅ Progetti staging se li usi attivamente

---

## 📝 Prossimi Step

1. **Identifica i 3 progetti** su Vercel Dashboard
2. **Verifica Root Directory** di ciascuno
3. **Decidi quali mantenere**:
   - 2 progetti produzione (ecommerce-homepage + baux-paws-access)
   - Eventuali progetti staging
4. **Elimina progetti obsoleti** se presenti
5. **Configura staging** sui progetti corretti

---

## 💡 Domande da Farti

1. **Quali sono i nomi dei 3 progetti su Vercel?**
2. **Quali Root Directory hanno?**
3. **Quali branch usano per production?**
4. **Quali URL hanno?**

Con queste informazioni posso aiutarti a identificare esattamente cosa serve e cosa no.

