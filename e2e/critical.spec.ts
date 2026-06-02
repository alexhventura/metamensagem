import { test, expect } from '@playwright/test';

const BASE = process.env.MM_E2E_BASE_URL ?? 'http://127.0.0.1:4173';

test.describe('MetaMensagem — bugs críticos', () => {
  test('mecanismo anchor: Blob → URL → clique dispara download', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15_000 }),
      page.evaluate(() => {
        const blob = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
          type: 'image/png',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mm-anchor-test.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });

  test('logo MetaMensagem volta para Home a partir de /frases', async ({ page }) => {
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Metamensagem.*pagina inicial/i }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
  });

  test('logo MetaMensagem fecha modal de imagem na Home', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const genBtn = page.getByRole('button', { name: /Gerar|Generate Image/i }).first();
    await expect(genBtn).toBeVisible({ timeout: 30_000 });
    await genBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: /Metamensagem.*pagina inicial/i }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('logo MetaMensagem fecha modal de imagem no detalhe da frase', async ({ page }) => {
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    const firstCard = page.locator('a[href^="/frases/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();
    await page.waitForURL(/\/frases\//);
    const genBtn = page.getByRole('button', { name: /Gerar|Generate Image/i }).first();
    await expect(genBtn).toBeVisible({ timeout: 30_000 });
    await genBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await page.getByRole('link', { name: /Metamensagem.*pagina inicial/i }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('logo MetaMensagem volta para Home a partir de detalhe de frase', async ({ page }) => {
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    const firstCard = page.locator('a[href^="/frases/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /Metamensagem.*pagina inicial/i }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`));
  });

  test('subnav METÁFORAS navega com modal de imagem aberto no detalhe da frase', async ({ page }) => {
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    const firstCard = page.locator('a[href^="/frases/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();
    await page.waitForURL(/\/frases\//);

    const genBtn = page.getByRole('button', { name: /Gerar|Generate Image/i }).first();
    await expect(genBtn).toBeVisible({ timeout: 30_000 });
    await genBtn.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await page.getByRole('link', { name: /Metáforas|METÁFORAS|Metaphors/i }).click();
    await expect(page).toHaveURL(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/metaforas/?$`));
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });

  test('gerador PNG produz blob válido e confirma download', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().includes('[mm-export]')) console.log(msg.text());
    });
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    const firstCard = page.locator('a[href^="/frases/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();
    await page.waitForURL(/\/frases\//);

    const genBtn = page.getByRole('button', { name: /Gerar|Generate Image/i }).first();
    await expect(genBtn).toBeVisible({ timeout: 30_000 });
    await genBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const pngBtn = dialog.getByRole('button', { name: /^PNG$/i });
    await expect(pngBtn).toBeVisible();

    const downloadPromise = page
      .waitForEvent('download', { timeout: 120_000 })
      .catch(() => null);

    await pngBtn.click();

    await page.waitForFunction(
      () => {
        const w = window as Window & {
          __mmLastExport?: { size: number };
          __mmLastExportError?: string;
        };
        return Boolean(w.__mmLastExport || w.__mmLastExportError);
      },
      { timeout: 130_000 }
    );
    const exportErr = await page.evaluate(() => {
      const w = window as Window & { __mmLastExportError?: string };
      return w.__mmLastExportError ?? null;
    });
    if (exportErr) throw new Error(`Export failed: ${exportErr}`);

    await expect(page.getByText(/Imagem baixada/i)).toBeVisible({ timeout: 5_000 });

    await page.waitForFunction(
      () => {
        const w = window as Window & { __mmLastExport?: { size: number } };
        return (w.__mmLastExport?.size ?? 0) > 10_000;
      },
      { timeout: 130_000 }
    );

    const exportMeta = await page.evaluate(() => {
      const w = window as Window & {
        __mmLastExport?: { size: number; type: string };
      };
      return w.__mmLastExport ?? null;
    });
    expect(exportMeta).not.toBeNull();
    expect(exportMeta!.size).toBeGreaterThan(10_000);

    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.png$/i);
      expect(await download.path()).toBeTruthy();
    }
  });

  test('gerador JPG produz blob válido e confirma download', async ({ page }) => {
    await page.goto(`${BASE}/frases`, { waitUntil: 'networkidle' });
    const firstCard = page.locator('a[href^="/frases/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await firstCard.click();
    await page.waitForURL(/\/frases\//);

    const genBtn = page.getByRole('button', { name: /Gerar|Generate Image/i }).first();
    await expect(genBtn).toBeVisible({ timeout: 30_000 });
    await genBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    const jpgBtn = dialog.getByRole('button', { name: /^JPG$/i });
    const downloadPromise = page
      .waitForEvent('download', { timeout: 120_000 })
      .catch(() => null);

    await jpgBtn.click();

    await expect(page.getByText(/Imagem baixada/i)).toBeVisible({ timeout: 130_000 });

    await page.waitForFunction(
      () => {
        const w = window as Window & { __mmLastExport?: { size: number } };
        return (w.__mmLastExport?.size ?? 0) > 10_000;
      },
      { timeout: 130_000 }
    );

    const exportMeta = await page.evaluate(() => {
      const w = window as Window & {
        __mmLastExport?: { size: number; type: string };
      };
      return w.__mmLastExport ?? null;
    });
    expect(exportMeta).not.toBeNull();
    expect(exportMeta!.size).toBeGreaterThan(10_000);

    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.jpe?g$/i);
    }
  });
});
