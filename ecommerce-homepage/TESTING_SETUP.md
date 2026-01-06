# Setup Completo Testing Pre-Migrazione

## 🎯 Obiettivo
Configurare ambiente di test completo PRIMA di iniziare qualsiasi migrazione.

## 📋 Checklist Setup

### 1. Installazione Dipendenze

```bash
cd ecommerce-homepage

# Installare Playwright
npm install -D @playwright/test

# Installare browser per Playwright
npx playwright install
```

### 2. Configurazione Script

Gli script sono già aggiunti a `package.json`:
- `npm run test:baseline` - Crea baseline test
- `npm run test:compare` - Confronta con baseline
- `npm run test:e2e` - Esegue test E2E
- `npm run test:complete` - Esegue tutti i test

### 3. Creare Baseline

```bash
# Eseguire tutti i test e creare baseline
npm run test:baseline
```

Questo creerà:
- `.test-baseline/results.json` - Risultati test
- `.test-baseline/coverage.json` - Coverage baseline
- `.test-baseline/performance.json` - Performance baseline (se configurato)

### 4. Verificare Test Esistenti

```bash
# Eseguire test unitari
npm test

# Eseguire test con coverage
npm run test:coverage

# Verificare che tutti passino
```

### 5. Aggiungere Test Mancanti

Basandosi su `TEST_SUITE_COMPLETE.md`, aggiungere test per:
- [ ] Tutte le pagine
- [ ] Tutte le funzionalità
- [ ] Tutti i componenti
- [ ] Tutti gli hook
- [ ] Tutte le API

### 6. Test E2E Base

```bash
# Eseguire test E2E
npm run test:e2e

# Verificare che passino
```

### 7. Documentare Baseline

Creare documento con:
- [ ] Coverage attuale
- [ ] Performance attuale (FCP, LCP, TTI)
- [ ] Screenshot delle pagine principali
- [ ] Lista funzionalità testate

## 🚀 Processo per Ogni Step

Dopo ogni step di migrazione:

1. **Eseguire test**
   ```bash
   npm run test:complete
   ```

2. **Confrontare con baseline**
   ```bash
   npm run test:compare
   ```

3. **Verificare risultati**
   - Tutti i test devono passare
   - Coverage non deve degradare >5%
   - Performance non deve degradare

4. **Se tutto OK**: Procedere al prossimo step
5. **Se problemi**: Fix immediato, non procedere

## 📊 Report Template

Dopo ogni step, creare report:

```markdown
# Step [N] Report - [Data]

## Test Eseguiti
- Unit tests: ✅/❌
- E2E tests: ✅/❌
- Coverage: X% (baseline: Y%)
- Performance: [Metriche]

## Issues
- [Issue 1]
- [Issue 2]

## Decisione
- [ ] ✅ APPROVATO
- [ ] ❌ BLOCCATO
```

## ⚠️ REGOLE FERREE

1. **Nessun test può essere saltato**
2. **Se anche un test fallisce, BLOCCO**
3. **Coverage non può degradare >5%**
4. **Performance non può degradare**
5. **Ogni step deve essere approvato**

---

**ZERO TOLERANZA = SUCCESSO GARANTITO**

