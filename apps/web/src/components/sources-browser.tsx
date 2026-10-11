'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { fetchSources, fetchRuns } from '../lib/catalog';
import type { CatalogPage, RunSummary } from '../lib/catalog';
import { DateTime, ReadError, ReadLoading, useRead } from './read-state';

const statusLabels = {
  RUNNING: 'Em execução / incompleta',
  SUCCESS: 'Concluída',
  FAILED: 'Falhou',
};
function Status({ run }: { run: RunSummary | null }) {
  return (
    <span className={`run-status status-${run?.status.toLowerCase() ?? 'never'}`}>
      {run ? statusLabels[run.status] : 'Nunca sincronizada'}
    </span>
  );
}
function Pagination({
  data,
  path,
  query,
}: {
  data: CatalogPage<unknown>;
  path: string;
  query: string;
}) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (page: number) => {
    const p = new URLSearchParams(query);
    p.set('page', String(page));
    return `${path}?${p}`;
  };
  return data.total > 0 ? (
    <nav className="pagination" aria-label="Paginação">
      <div>{data.page > 1 && <Link href={href(data.page - 1)}>← Anterior</Link>}</div>
      <p>
        Página <strong>{data.page}</strong> de {pages}
      </p>
      <div>{data.page < pages && <Link href={href(data.page + 1)}>Próxima →</Link>}</div>
    </nav>
  ) : null;
}
function SourceResults({ query }: { query: string }) {
  const { state, retry } = useRead(fetchSources, query);
  if (state.type === 'loading') return <ReadLoading />;
  if (state.type === 'error') return <ReadError kind={state.kind} retry={retry} />;
  const data = state.data;
  return (
    <section aria-label="Fontes configuradas" aria-live="polite">
      <div className="results-heading">
        <p>
          <strong>{data.total}</strong> fontes encontradas
        </p>
        <Link className="text-link" href="/sync-runs">
          Ver todo o histórico →
        </Link>
      </div>
      {data.items.length ? (
        <ul className="sources-grid">
          {data.items.map((source) => (
            <li className="source-card" key={source.id}>
              <div className="job-card-heading">
                <span className="source-badge">{source.platform}</span>
                <span className="source-enabled">
                  {source.enabled ? 'Habilitada' : 'Desabilitada'}
                </span>
              </div>
              <h2>{source.company.name}</h2>
              <p className="source-board">
                {source.boardKey} · {source.region}
              </p>
              <Status run={source.latestRun} />
              <dl className="metadata-list">
                <div>
                  <dt>Última tentativa</dt>
                  <dd>
                    {source.latestRun ? (
                      <DateTime value={source.latestRun.startedAt} />
                    ) : (
                      'Nenhuma tentativa'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Último sucesso</dt>
                  <dd>
                    {source.lastSuccessfulAt ? (
                      <DateTime value={source.lastSuccessfulAt} />
                    ) : (
                      'Nenhum sucesso registrado'
                    )}
                  </dd>
                </div>
              </dl>
              {source.latestRun?.status === 'FAILED' && (
                <p className="source-warning">
                  A última tentativa falhou. Os anúncios anteriores foram preservados.
                </p>
              )}
              {source.latestRun?.status === 'RUNNING' && (
                <p className="scope-note">
                  Conclusão ainda não registrada. Pode estar em andamento ou ter sido interrompida.
                </p>
              )}
              <div className="source-actions">
                <Link className="text-link" href={`/sync-runs?sourceId=${source.id}`}>
                  Histórico de {source.company.name} →
                </Link>
                <Link className="text-link" href={`/jobs?sourceId=${source.id}`}>
                  Ver oportunidades
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="jobs-state">
          <h2>Nenhuma fonte encontrada</h2>
          <p>Não há fontes para esta consulta.</p>
          <Link href="/sources" className="text-link">
            Limpar filtros
          </Link>
        </div>
      )}
      <Pagination data={data} path="/sources" query={query} />
    </section>
  );
}
function RunResults({ query }: { query: string }) {
  const { state, retry } = useRead(fetchRuns, query);
  if (state.type === 'loading') return <ReadLoading />;
  if (state.type === 'error') return <ReadError kind={state.kind} retry={retry} />;
  const data = state.data;
  return (
    <section aria-label="Histórico de sincronizações" aria-live="polite">
      <div className="results-heading">
        <p>
          <strong>{data.total}</strong> execuções encontradas
        </p>
        <span>Tentativas mais recentes primeiro</span>
      </div>
      {data.items.length ? (
        <ol className="runs-list">
          {data.items.map((run) => (
            <li className="run-card" key={run.id}>
              <div className="job-card-heading">
                <div>
                  <p className="eyebrow">
                    {run.source.platform} · {run.source.boardKey}
                  </p>
                  <h2>{run.source.company.name}</h2>
                </div>
                <Status run={run} />
              </div>
              <dl className="run-dates">
                <div>
                  <dt>Início</dt>
                  <dd>
                    <DateTime value={run.startedAt} />
                  </dd>
                </div>
                <div>
                  <dt>Conclusão</dt>
                  <dd>{run.finishedAt ? <DateTime value={run.finishedAt} /> : 'Não registrada'}</dd>
                </div>
                <div>
                  <dt>Duração</dt>
                  <dd>
                    {run.durationMs === null
                      ? 'Indisponível'
                      : `${(run.durationMs / 1000).toLocaleString('pt-BR')} s`}
                  </dd>
                </div>
              </dl>
              <dl className="run-counters">
                {(
                  [
                    ['Recebidos', run.fetchedCount],
                    ['Criados', run.createdCount],
                    ['Atualizados', run.updatedCount],
                    ['Ignorados', run.skippedCount],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {run.errorCode && (
                <p className="source-warning">
                  Código de falha: <code>{run.errorCode}</code>
                </p>
              )}
              {run.status === 'RUNNING' && (
                <p className="scope-note">
                  Execução incompleta: não há confirmação de sucesso. O registro pode representar um
                  processo ativo ou interrompido.
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="jobs-state">
          <h2>Nenhuma sincronização encontrada</h2>
          <p>Não há execuções registradas para esta consulta.</p>
        </div>
      )}
      <Pagination data={data} path="/sync-runs" query={query} />
    </section>
  );
}
export function SourcesBrowser({ history = false }: { history?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  function filter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    const next = new URLSearchParams(query);
    next.delete('page');
    for (const key of ['platform', history ? 'status' : 'enabled']) {
      const value = String(values.get(key) ?? '');
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`${history ? '/sync-runs' : '/sources'}?${next}`);
  }
  return (
    <>
      <form
        className="jobs-filters catalog-filters"
        key={`filters:${query}`}
        onSubmit={filter}
        aria-label={history ? 'Filtrar histórico' : 'Filtrar fontes'}
      >
        <div className="field">
          <label htmlFor="catalog-platform">Plataforma</label>
          <select id="catalog-platform" name="platform" defaultValue={params.get('platform') ?? ''}>
            <option value="">Todas</option>
            <option value="GREENHOUSE">Greenhouse</option>
            <option value="ASHBY">Ashby</option>
            <option value="LEVER">Lever</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="catalog-state">{history ? 'Resultado' : 'Configuração'}</label>
          {history ? (
            <select id="catalog-state" name="status" defaultValue={params.get('status') ?? ''}>
              <option value="">Todos os resultados</option>
              <option value="SUCCESS">Concluída</option>
              <option value="FAILED">Falhou</option>
              <option value="RUNNING">Em execução / incompleta</option>
            </select>
          ) : (
            <select id="catalog-state" name="enabled" defaultValue={params.get('enabled') ?? ''}>
              <option value="">Todas as fontes</option>
              <option value="true">Habilitadas</option>
              <option value="false">Desabilitadas</option>
            </select>
          )}
        </div>
        <button className="primary-button" type="submit">
          Aplicar filtros
        </button>
        <Link className="text-link" href={history ? '/sync-runs' : '/sources'}>
          Limpar filtros
        </Link>
      </form>
      {history ? (
        <RunResults query={query} key={`runs:${query}`} />
      ) : (
        <SourceResults query={query} key={`sources:${query}`} />
      )}
    </>
  );
}
