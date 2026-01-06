# Verifica Root Directory su Vercel Dashboard

## 🔍 Come Verificare se la Root Directory è Corretta

### Step 1: Vai su Vercel Dashboard

1. Vai su https://vercel.com/dashboard
2. Seleziona progetto **`bauscape-staging`**
3. Vai su **Settings** → **General**
4. Scorri fino a **Root Directory**

### Step 2: Verifica il Valore

**Se vedi:**
- Campo vuoto o `/` → ❌ **SBAGLIATO** - Vercel cerca nella root del repository
- `ecommerce-homepage` → ✅ **CORRETTO** - Vercel cerca in `ecommerce-homepage/`

### Step 3: Perché `ecommerce-homepage`?

Il repository è un **monorepo** con questa struttura:

```
bauScape-staging/
├── ecommerce-homepage/          ← QUI sono i file Next.js
│   ├── src/
│   │   └── app/                  ← Pagine Next.js
│   ├── next.config.js            ← Configurazione Next.js
│   ├── package.json              ← Dipendenze Next.js
│   └── .next/                    ← Build output (generato)
├── baux-paws-access/             ← Altro progetto (Vite)
└── package.json                  ← Root package.json (monorepo)
```

**I file Next.js sono in `ecommerce-homepage/`, NON nella root!**

### Step 4: Cosa Succede Durante il Build

Quando Vercel esegue il build:

1. **Clona il repository** → `/vercel/path0/`
2. **Se Root Directory = vuoto**:
   - Cerca `next.config.js` in `/vercel/path0/` → ❌ Non trovato
   - Cerca `.next/` in `/vercel/path0/` → ❌ Non trovato
   - Errore: "routes-manifest.json not found"

3. **Se Root Directory = `ecommerce-homepage`**:
   - Cerca `next.config.js` in `/vercel/path0/ecommerce-homepage/` → ✅ Trovato
   - Cerca `.next/` in `/vercel/path0/ecommerce-homepage/` → ✅ Trovato
   - Build funziona!

## 📋 Verifica File nel Repository

I file Next.js **ci sono** nel repository staging:

```bash
# Verifica file Next.js nel repository
git ls-tree -r staging-clean-final --name-only | grep "^ecommerce-homepage/src/app"
```

Risultato: **15+ file** trovati, inclusi:
- `ecommerce-homepage/src/app/page.tsx`
- `ecommerce-homepage/src/app/layout.tsx`
- `ecommerce-homepage/src/app/checkout/page.tsx`
- `ecommerce-homepage/next.config.js`
- `ecommerce-homepage/package.json`

## ✅ Soluzione

1. Vai su Vercel Dashboard → Settings → General → Root Directory
2. Imposta: **`ecommerce-homepage`**
3. Salva
4. Riedploya

## 🔍 Perché Vedi "Cartella Vuota"?

Se vedi la cartella "praticamente vuota" su:
- **GitHub**: GitHub mostra solo alcuni file per default. I file ci sono, ma potrebbero non essere visibili nella vista principale.
- **Vercel Dashboard**: La Root Directory vuota non significa che la cartella sia vuota, significa solo che Vercel non sa dove cercare i file.

**I file ci sono nel repository!** Devi solo dire a Vercel dove cercarli impostando Root Directory = `ecommerce-homepage`.

