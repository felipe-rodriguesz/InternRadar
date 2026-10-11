import { expect, test } from '@playwright/test';

test('@empty banco real vazio explica a sincronização local', async ({ page }) => {
  const response = page.waitForResponse('**/api/v1/jobs?*');
  await page.goto('/jobs');
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Ainda não há vagas armazenadas' })).toBeVisible();
  await expect(page.getByText('pnpm sync:jobs', { exact: true })).toBeVisible();
});

test('API e PostgreSQL reais: 23 fixtures, página 2 e links originais seguros', async ({
  page,
}) => {
  await page.goto('/jobs');
  await expect(page.getByText('23 oportunidades encontradas')).toBeVisible();
  await expect(page.locator('.job-card')).toHaveCount(20);
  await expect(page.locator('.job-card').first()).toContainText('Fixture Browser Company');
  await expect(page.locator('.job-card').first()).toContainText('Identificada pelo InternRadar');
  await expect(page.locator('.job-card').first()).toContainText('Data de publicação não informada');
  const firstTitles = await page.locator('.job-card h2').allTextContents();
  const links = page.getByRole('link', { name: /^Ver vaga original:/ });
  expect(await links.count()).toBe(20);
  await expect(links.first()).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(links.first()).toHaveAttribute(
    'href',
    /^https:\/\/example.com\/jobs\/browser-fixture-/,
  );
  await page.getByRole('link', { name: 'Próxima →' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.job-card')).toHaveCount(3);
  for (const title of await page.locator('.job-card h2').allTextContents())
    expect(firstTitles).not.toContain(title);
  await page.goBack();
  await expect(page.locator('.job-card')).toHaveCount(20);
});

test('busca, filtros combinados, URL compartilhável e histórico', async ({ page }) => {
  await page.goto('/jobs');
  await page.getByLabel('O que você procura?').fill('react');
  await page.getByLabel('Plataforma', { exact: true }).selectOption('GREENHOUSE');
  await page.getByLabel('Modalidade', { exact: true }).selectOption('REMOTE');
  await page.getByLabel('Localização', { exact: true }).fill('curitiba');
  await page.getByRole('button', { name: 'Buscar oportunidades' }).click();
  await expect(page).toHaveURL(
    /q=react&platform=GREENHOUSE&workplaceType=REMOTE&location=curitiba/,
  );
  await expect(page.getByText('1 oportunidade encontrada')).toBeVisible();
  await expect(page.getByRole('search')).toHaveCount(1);
  await page.getByRole('button', { name: 'Buscar oportunidades' }).click();
  await expect(page.getByRole('search')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Fixture React Intern' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('O que você procura?')).toHaveValue('react');
  await expect(page.locator('.job-card')).toHaveCount(1);
  await page.getByRole('link', { name: 'Limpar filtros', exact: true }).click();
  await expect(page.locator('.job-card')).toHaveCount(20);
  await page.goBack();
  await expect(page.getByLabel('Localização', { exact: true })).toHaveValue('curitiba');
  await expect(page.locator('.job-card')).toHaveCount(1);
});

test('filtro sem resultados e URL inválida são estados distintos', async ({ page }) => {
  await page.goto('/jobs?q=nenhuma-fixture-corresponde');
  await expect(
    page.getByRole('heading', { name: 'Nenhum resultado para estes filtros' }),
  ).toBeVisible();
  await expect(page.getByText('0 oportunidades encontradas')).toBeVisible();
  await page.goto('/jobs?page=0');
  await expect(page.getByRole('heading', { name: 'Confira os filtros da pesquisa' })).toBeVisible();
});

test('loading, falha de conexão e nova tentativa com API real', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/jobs?*', async (route) => {
    await gate;
    await route.abort('connectionrefused');
  });
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: 'Buscando oportunidades…' })).toBeVisible();
  release();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível conectar à API' }),
  ).toBeVisible();
  await expect(page.locator('.job-card')).toHaveCount(0);
  await page.unroute('**/api/v1/jobs?*');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.job-card')).toHaveCount(20);
});

test('erro 500 simulado não é confundido com lista vazia', async ({ page }) => {
  await page.route('**/api/v1/jobs?*', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Falha sintética de teste.',
      }),
    }),
  );
  await page.goto('/jobs');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar as vagas' }),
  ).toBeVisible();
  await expect(page.getByText('Ainda não há vagas armazenadas')).toHaveCount(0);
});

test('375px, teclado, foco e navegação desde a página inicial', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('link', { name: 'Buscar oportunidades →' }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.locator('.job-card')).toHaveCount(20);
  await page.reload();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('O que você procura?')).toBeFocused();
  await page.keyboard.type('react');
  await page.keyboard.press('Enter');
  await expect(page.locator('.job-card')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'test-results/jobs-mobile.png', fullPage: true });
});
