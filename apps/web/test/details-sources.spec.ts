import { expect, test } from '@playwright/test';

const absent = '16ff186a-c58b-468f-bb60-e6695dd1f854';
const optional = 'c6cfbda2-3804-42a9-9bc1-8f6e3d8234cc';

test('@empty sources and history show true empty PostgreSQL states', async ({ page }) => {
  await page.goto('/sources');
  await expect(page.getByRole('heading', { name: 'Nenhuma fonte encontrada' })).toBeVisible();
  await page.getByRole('link', { name: 'Ver todo o histórico' }).click();
  await expect(
    page.getByRole('heading', { name: 'Nenhuma sincronização encontrada' }),
  ).toBeVisible();
});
test('real details navigation preserves search and safe external link', async ({ page }) => {
  await page.goto('/jobs?q=react');
  const detail = page.waitForResponse(/\/api\/v1\/jobs\/[a-f0-9-]+$/);
  await page.getByRole('heading', { name: 'Fixture React Intern' }).getByRole('link').click();
  expect((await detail).status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Fixture React Intern');
  await expect(
    page.getByText('Anúncio sintético para testes de interface. Não é oportunidade real.'),
  ).toBeVisible();
  await expect(page.getByText('Data de publicação não informada')).toBeVisible();
  const original = page.getByRole('link', { name: 'Acessar anúncio original' });
  await expect(original).toHaveAttribute('href', 'https://example.com/jobs/browser-fixture-0');
  await expect(original).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(original).toHaveAttribute('target', '_blank');
  await expect(
    page.getByText('A candidatura acontece fora do InternRadar', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Voltar à listagem' }).click();
  await expect(page).toHaveURL(/\/jobs\?q=react$/);
});
test('details missing fields, UNKNOWN, unlisted and invalid legacy URL are honest', async ({
  page,
}) => {
  await page.goto(`/jobs/${optional}`);
  await expect(page.getByRole('heading', { name: 'Fixture Optional Details' })).toBeVisible();
  await expect(
    page.getByText('A fonte não informou uma descrição para esta oportunidade.'),
  ).toBeVisible();
  await expect(page.getByText('Modalidade: Não informada')).toBeVisible();
  await expect(page.getByText('Link original indisponível')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Acessar anúncio original' })).toHaveCount(0);
  await expect(
    page.getByText('A fonte marcou este anúncio como não listado.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.job-description script')).toHaveCount(0);
});
test('details 400 and 404 HTTP states', async ({ page }) => {
  await page.goto('/jobs/invalid');
  await expect(page.getByRole('heading', { name: 'Endereço ou filtros inválidos' })).toBeVisible();
  await page.goto(`/jobs/${absent}`);
  await expect(page.getByRole('heading', { name: 'Vaga não encontrada' })).toBeVisible();
});
test('details loading, network error and retry return to real API', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/api/v1/jobs/${optional}`, async (route) => {
    await gate;
    await route.abort();
  });
  await page.goto(`/jobs/${optional}`);
  await expect(page.getByText('Carregando informações…')).toBeVisible();
  release();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível conectar à API' }),
  ).toBeVisible();
  await page.unroute(`**/api/v1/jobs/${optional}`);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('heading', { name: 'Fixture Optional Details' })).toBeVisible();
});
test('sources show never, disabled, latest failure, prior success and incomplete RUNNING', async ({
  page,
}) => {
  await page.goto('/sources');
  await expect(page.locator('.source-card')).toHaveCount(4);
  const failed = page.locator('.source-card').filter({ hasText: 'synthetic-browser' });
  await expect(failed.getByText('Falhou', { exact: true })).toBeVisible();
  await expect(failed.getByText('Último sucesso')).toBeVisible();
  await expect(failed.getByText('Nenhum sucesso registrado')).toHaveCount(0);
  await expect(page.locator('.source-card').filter({ hasText: 'fixture-never' })).toContainText(
    'Nunca sincronizada',
  );
  await expect(page.locator('.source-card').filter({ hasText: 'fixture-disabled' })).toContainText(
    'Desabilitada',
  );
  await expect(page.locator('.source-card').filter({ hasText: 'fixture-running' })).toContainText(
    'Em execução / incompleta',
  );
  await failed.getByRole('link', { name: /^Histórico de/ }).click();
  await expect(page).toHaveURL(/sync-runs\?sourceId=/);
  await expect(page.locator('.run-card').first()).toContainText('NETWORK_ERROR');
  await expect(page.locator('.run-card')).toHaveCount(20);
  await page.getByRole('link', { name: 'Próxima →' }).click();
  await expect(page.locator('.run-card')).toHaveCount(4);
});
test('sources and history filters, URL pagination, incomplete and empty responses', async ({
  page,
}) => {
  await page.goto('/sources?pageSize=2');
  await expect(page.locator('.source-card')).toHaveCount(2);
  await page.getByRole('link', { name: 'Próxima →' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.source-card')).toHaveCount(2);
  await page.getByLabel('Configuração').selectOption('false');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.locator('.source-card')).toHaveCount(1);
  await expect(page.locator('.source-card')).toContainText('LEVER');
  await page.goto('/sync-runs?status=RUNNING');
  await expect(page.locator('.run-card')).toHaveCount(1);
  await expect(page.locator('.run-card')).toContainText('Não registrada');
  await expect(page.locator('.run-card')).toContainText('Indisponível');
  await page.getByLabel('Plataforma').selectOption('LEVER');
  await page.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(
    page.getByRole('heading', { name: 'Nenhuma sincronização encontrada' }),
  ).toBeVisible();
});
test('sources loading and backend error retry; history network errors', async ({ page }) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/sources?*', async (route) => {
    await gate;
    await route.fulfill({ status: 500, body: '{}' });
  });
  await page.goto('/sources');
  await expect(page.getByText('Carregando informações…')).toBeVisible();
  release();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar as informações' }),
  ).toBeVisible();
  await page.unroute('**/api/v1/sources?*');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.locator('.source-card')).toHaveCount(4);
  await page.route('**/api/v1/sync-runs?*', (route) => route.abort());
  await page.goto('/sync-runs');
  await expect(
    page.getByRole('heading', { name: 'Não foi possível conectar à API' }),
  ).toBeVisible();
});
test('details and provenance keyboard navigation and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of [`/jobs/${optional}`, '/sources', '/sync-runs']) {
    await page.goto(path);
    await expect(page.getByText('Carregando informações…')).toHaveCount(0);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      path.startsWith('/jobs/')
        ? page.getByRole('link', { name: 'Voltar à listagem' })
        : path === '/sources'
          ? page.getByLabel('Plataforma')
          : page.getByRole('link', { name: 'Voltar às fontes' }),
    ).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/${path.startsWith('/jobs/') ? 'details' : path.slice(1)}-mobile.png`,
      fullPage: true,
    });
  }
});

test('published date and closed status stay explicit; legacy markup is rendered as text', async ({
  page,
}) => {
  await page.goto('/jobs/c6cfbda2-3804-42a9-9bc1-8f6e3d8234cd');
  await expect(page.getByRole('heading', { name: 'Fixture Published Details' })).toBeVisible();
  await expect(page.locator('time[datetime="2026-09-02T12:00:00.000Z"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Encerrada', exact: true })).toBeVisible();
  await expect(page.locator('.job-description')).toContainText('<script>');
  await expect(page.locator('.job-description script')).toHaveCount(0);
  expect(await page.evaluate(() => '__fixtureXss' in window)).toBe(false);
});
