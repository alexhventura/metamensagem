import { test, expect } from '@playwright/test';

const BASE = process.env.MM_E2E_BASE_URL ?? 'http://127.0.0.1:4173';

test.describe('Tradução mobile', () => {
  test('botão de tradução visível no header', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'mobile only');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const trigger = page.locator('.mm-page-translate-trigger').first();
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    const box = await trigger.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
  });

  test('modal abre com lista de idiomas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'mobile only');
    await page.goto(`${BASE}/frases`, { waitUntil: 'domcontentloaded' });
    await page.locator('.mm-page-translate-trigger').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.mm-page-translate-panel')).toBeVisible();
    for (const code of ['pt', 'en', 'es', 'it', 'fr', 'de', 'nl', 'ja', 'zh']) {
      await expect(page.locator(`[data-lang="${code}"]`)).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('auto-tradução UI para en-US', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'mobile only');
    await page.addInitScript(() => {
      localStorage.removeItem('mm-page-translate-pref');
      localStorage.removeItem('lang');
    });
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    await expect(page.getByRole('link', { name: /Quotes|Frases/i }).first()).toBeVisible({
      timeout: 20_000,
    });
    const pref = await page.evaluate(() => localStorage.getItem('mm-page-translate-pref'));
    expect(pref).toBe('en');
  });

  test('Safari iOS: safe-area no painel do modal', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-ios', 'iOS only');
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.mm-page-translate-trigger').first().click();
    const panel = page.locator('.mm-page-translate-panel');
    await expect(panel).toBeVisible({ timeout: 10_000 });
    const paddingBottom = await panel.evaluate((el) => getComputedStyle(el).paddingBottom);
    expect(paddingBottom).not.toBe('0px');
  });

  test('seleção de idioma persiste no localStorage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'mobile only');
    await page.addInitScript(() => {
      localStorage.removeItem('mm-page-translate-pref');
    });
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('.mm-page-translate-trigger').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-lang="es"]').click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
    const pref = await page.evaluate(() => localStorage.getItem('mm-page-translate-pref'));
    expect(pref).toBe('es');
  });

  test('Globe2 no botão do card (sem emoji)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'mobile only');
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const cardTranslate = page.locator('.mm-page-translate-trigger').nth(1);
    await expect(cardTranslate).toBeVisible({ timeout: 20_000 });
    expect(await cardTranslate.locator('svg').count()).toBeGreaterThan(0);
    const text = await cardTranslate.textContent();
    expect(text ?? '').not.toContain('🌎');
  });
});
