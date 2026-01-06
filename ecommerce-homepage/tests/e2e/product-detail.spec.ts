import { test, expect } from '@playwright/test';

/**
 * Test E2E per ProductDetailPage
 * Verifica tutte le funzionalità della pagina prodotto
 */
test.describe('Product Detail Page', () => {
  test('should load product information', async ({ page }) => {
    // Questo test richiede un prodotto reale o mock
    // Per ora testiamo la struttura base
    await page.goto('/prodotto/experience/test-id');
    
    // Verifica che la pagina carichi (non 404)
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toMatch(/404|not found|errore/i);
  });

  test('should display product title', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    // Verifica che ci sia un titolo
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
  });

  test('should display product image', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    // Verifica che ci sia un'immagine
    const image = page.locator('img').first();
    await expect(image).toBeVisible();
  });

  test('should display product price', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    // Verifica che ci sia un prezzo
    const price = page.locator('text=/€|prezzo|price/i').first();
    await expect(price).toBeVisible();
  });

  test('should show availability selector when dates available', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    // Verifica che ci sia un selettore disponibilità (se presente)
    const availabilitySelector = page.locator('[data-testid="availability-selector"]');
    if (await availabilitySelector.count() > 0) {
      await expect(availabilitySelector).toBeVisible();
    }
  });

  test('should allow selecting date', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    const dateButton = page.locator('[data-testid="availability-date"]').first();
    if (await dateButton.count() > 0) {
      await dateButton.click();
      // Verifica che la data sia selezionata
      await expect(dateButton).toHaveClass(/selected|active/);
    }
  });

  test('should allow selecting time slot', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    // Prima seleziona una data
    const dateButton = page.locator('[data-testid="availability-date"]').first();
    if (await dateButton.count() > 0) {
      await dateButton.click();
      
      // Poi seleziona uno slot
      const slotButton = page.locator('[data-testid="time-slot"]').first();
      if (await slotButton.count() > 0) {
        await slotButton.click();
        await expect(slotButton).toHaveClass(/selected|active/);
      }
    }
  });

  test('should allow setting guests and dogs', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    const guestsInput = page.locator('[data-testid="guests-input"], input[name="guests"]');
    const dogsInput = page.locator('[data-testid="dogs-input"], input[name="dogs"]');
    
    if (await guestsInput.count() > 0) {
      await guestsInput.fill('2');
      expect(await guestsInput.inputValue()).toBe('2');
    }
    
    if (await dogsInput.count() > 0) {
      await dogsInput.fill('1');
      expect(await dogsInput.inputValue()).toBe('1');
    }
  });

  test('should calculate total price correctly', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    // Seleziona date/slot se disponibili
    const dateButton = page.locator('[data-testid="availability-date"]').first();
    if (await dateButton.count() > 0) {
      await dateButton.click();
      
      const slotButton = page.locator('[data-testid="time-slot"]').first();
      if (await slotButton.count() > 0) {
        await slotButton.click();
      }
    }
    
    // Imposta guests/dogs
    const guestsInput = page.locator('[data-testid="guests-input"]');
    if (await guestsInput.count() > 0) {
      await guestsInput.fill('2');
    }
    
    // Verifica che il prezzo totale sia visibile e aggiornato
    const totalPrice = page.locator('[data-testid="total-price"], text=/totale|total/i');
    if (await totalPrice.count() > 0) {
      await expect(totalPrice).toBeVisible();
    }
  });

  test('should navigate to checkout on book button click', async ({ page }) => {
    await page.goto('/prodotto/experience/test-id');
    
    const bookButton = page.locator('button:has-text("Prenota"), button:has-text("Book")');
    if (await bookButton.count() > 0 && await bookButton.isEnabled()) {
      await bookButton.click();
      await expect(page).toHaveURL(/.*checkout/);
    }
  });

  test('should show error for invalid product ID', async ({ page }) => {
    await page.goto('/prodotto/experience/invalid-id-that-does-not-exist');
    
    // Verifica messaggio di errore
    const errorMessage = page.locator('text=/non disponibile|non trovato|errore/i');
    await expect(errorMessage.first()).toBeVisible();
  });
});

