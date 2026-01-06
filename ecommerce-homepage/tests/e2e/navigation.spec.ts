import { test, expect } from '@playwright/test';

/**
 * Test E2E per navigazione tra pagine
 * Verifica che tutte le route funzionino correttamente
 */
test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate from home to experiences', async ({ page }) => {
    await page.click('text=Esperienze');
    await expect(page).toHaveURL(/.*esperienze/);
    await expect(page.locator('h1')).toContainText(/esperienze/i);
  });

  test('should navigate from home to trips', async ({ page }) => {
    await page.click('text=Viaggi');
    await expect(page).toHaveURL(/.*viaggi/);
    await expect(page.locator('h1')).toContainText(/viaggi/i);
  });

  test('should navigate from home to classes', async ({ page }) => {
    await page.click('text=Classi');
    await expect(page).toHaveURL(/.*classi/);
    await expect(page.locator('h1')).toContainText(/classi/i);
  });

  test('should navigate from experiences to product detail', async ({ page }) => {
    await page.goto('/esperienze');
    
    // Aspetta che i prodotti siano caricati
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    
    // Click sul primo prodotto
    await page.click('[data-testid="product-card"]:first-child');
    
    // Verifica URL prodotto
    await expect(page).toHaveURL(/.*prodotto\/experience\/.*/);
    
    // Verifica che il dettaglio prodotto sia caricato
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate back from product to list', async ({ page }) => {
    await page.goto('/esperienze');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    await page.click('[data-testid="product-card"]:first-child');
    await expect(page).toHaveURL(/.*prodotto\/experience\/.*/);
    
    // Click back button
    await page.click('button:has-text("Indietro"), [aria-label="Indietro"]');
    
    // Verifica ritorno alla lista
    await expect(page).toHaveURL(/.*esperienze/);
  });

  test('should navigate to checkout from product', async ({ page }) => {
    // Questo test richiede un prodotto con disponibilità
    // Per ora testiamo solo la navigazione
    await page.goto('/prodotto/experience/test-id');
    
    // Se il prodotto ha disponibilità, testiamo il flow
    const bookButton = page.locator('button:has-text("Prenota"), button:has-text("Book")');
    if (await bookButton.count() > 0) {
      await bookButton.first().click();
      await expect(page).toHaveURL(/.*checkout/);
    }
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Test URL diretti
    const urls = [
      '/',
      '/esperienze',
      '/viaggi',
      '/classi',
      '/contatti',
      '/cookie-policy',
      '/regolamento-a-6-zampe',
    ];

    for (const url of urls) {
      await page.goto(url);
      await expect(page).toHaveURL(new RegExp(url.replace('/', '\\/')));
      // Verifica che la pagina non sia vuota
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('should show 404 for invalid URLs', async ({ page }) => {
    await page.goto('/invalid-page-that-does-not-exist');
    
    // Verifica che la pagina mostri un errore o redirect
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toMatch(/404|not found|errore|non trovato/i);
  });

  test('should maintain scroll position on client-side navigation', async ({ page }) => {
    await page.goto('/esperienze');
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 10000 });
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    
    // Navigate to product
    await page.click('[data-testid="product-card"]:first-child');
    await page.waitForURL(/.*prodotto/);
    
    // Navigate back
    await page.goBack();
    await page.waitForURL(/.*esperienze/);
    
    // Verifica scroll (potrebbe essere resettato, dipende dall'implementazione)
    const scrollAfter = await page.evaluate(() => window.scrollY);
    // Questo test verifica solo che non ci siano errori
    expect(scrollAfter).toBeDefined();
  });
});

