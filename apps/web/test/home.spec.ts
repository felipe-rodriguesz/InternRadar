import { expect, test } from '@playwright/test';

test('consulta API real e mostra conexão confirmada', async ({ page }) => {
  const response = page.waitForResponse('http://127.0.0.1:3001/api/v1/health');
  await page.goto('/');
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Conexão estabelecida' })).toBeVisible();
  await expect(page.getByText('Conexão verificada', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mais possibilidades.');
  await page.getByRole('button', { name: 'Verificar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Conexão estabelecida' })).toBeVisible();
});

test('contrato de banco indisponível (resposta simulada) distingue API e PostgreSQL', async ({
  page,
}) => {
  await page.route('**/api/v1/health', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 503,
        code: 'DATABASE_UNAVAILABLE',
        message: 'Banco de dados temporariamente indisponível.',
      }),
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Banco de dados indisponível' })).toBeVisible();
  await expect(page.getByText('Disponível', { exact: true })).toBeVisible();
  await expect(page.getByText('Indisponível', { exact: true })).toBeVisible();
});

test('loading, falha de rede e recuperação sem resposta fictícia', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/health', async (route) => {
    await gate;
    await route.abort('connectionrefused');
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Verificando conexão…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verificando…' })).toBeDisabled();
  release();
  await expect(page.getByRole('heading', { name: 'Não foi possível conectar' })).toBeVisible();
  await expect(page.getByText('Não confirmado', { exact: true })).toBeVisible();
  await page.unroute('**/api/v1/health');
  await page.getByRole('button', { name: 'Verificar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Conexão estabelecida' })).toBeVisible();
});

test('layout móvel sem overflow e navegação por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Conexão estabelecida' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});
