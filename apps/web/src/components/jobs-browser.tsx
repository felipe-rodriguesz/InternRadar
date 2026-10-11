'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { fetchJobs, JobsError, safeExternalUrl } from '../lib/jobs';
import type { JobsPage, JobItem } from '../lib/jobs';

const platforms = { GREENHOUSE: 'Greenhouse', ASHBY: 'Ashby', LEVER: 'Lever' };
const workplaces = {
  REMOTE: 'Remota',
  HYBRID: 'Híbrida',
  ONSITE: 'Presencial',
  UNKNOWN: 'Não informada',
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(value),
  );

export function JobsLoading() {
  return (
    <div className="jobs-state" role="status">
      <span className="radar-loader" aria-hidden="true">
        ◎
      </span>
      <h2>Buscando oportunidades…</h2>
      <p>Consultando as vagas armazenadas no InternRadar.</p>
    </div>
  );
}

function JobCard({ job }: { job: JobItem }) {
  const url = safeExternalUrl(job.jobUrl);
  return (
    <li className="job-card">
      <div className="job-card-heading">
        <p className="job-company">{job.company.name}</p>
        <span className="source-badge">{platforms[job.source.platform]}</span>
      </div>
      <h2>{job.title}</h2>
      <div className="job-facts">
        <span>{job.location ?? 'Localização não informada'}</span>
        <span>
          {job.workplaceType === 'UNKNOWN'
            ? 'Modalidade não informada'
            : workplaces[job.workplaceType]}
        </span>
        {job.employmentType && <span>{job.employmentType}</span>}
      </div>
      <div className="job-card-bottom">
        <div className="job-dates">
          <p>
            Identificada pelo InternRadar{' '}
            <time dateTime={job.firstSeenAt}>{dateLabel(job.firstSeenAt)}</time>
          </p>
          <p>
            {job.publishedAt ? (
              <>
                Publicada em <time dateTime={job.publishedAt}>{dateLabel(job.publishedAt)}</time>
              </>
            ) : (
              'Data de publicação não informada'
            )}
          </p>
        </div>
        {url ? (
          <a
            className="job-original"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ver vaga original: ${job.title} (nova aba)`}
          >
            Ver vaga original <span aria-hidden="true">↗</span>
          </a>
        ) : (
          <span className="invalid-link">Link original indisponível</span>
        )}
      </div>
    </li>
  );
}

function Results({ query }: { query: string }) {
  const [state, setState] = useState<
    | { type: 'loading' }
    | { type: 'success'; data: JobsPage }
    | { type: 'error'; error: JobsError['kind'] }
  >({ type: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void fetchJobs(query, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ type: 'success', data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ type: 'error', error: error instanceof JobsError ? error.kind : 'contract' });
      });
    return () => controller.abort();
  }, [query, attempt]);
  if (state.type === 'loading') return <JobsLoading />;
  if (state.type === 'error')
    return (
      <section className="jobs-state error-state" role="alert">
        <p className="eyebrow">CONEXÃO INTERROMPIDA</p>
        <h2>
          {state.error === 'connection'
            ? 'Não foi possível conectar à API'
            : state.error === 'query'
              ? 'Confira os filtros da pesquisa'
              : 'Não foi possível carregar as vagas'}
        </h2>
        <p>
          {state.error === 'query'
            ? 'A URL contém um filtro inválido. Limpe os filtros e tente novamente.'
            : 'Os resultados não estão disponíveis agora. Tente novamente em instantes.'}
        </p>
        <div className="state-actions">
          <button
            className="primary-button"
            onClick={() => {
              setState({ type: 'loading' });
              setAttempt((value) => value + 1);
            }}
          >
            Tentar novamente
          </button>
          <Link href="/jobs" className="text-link">
            Limpar filtros
          </Link>
        </div>
      </section>
    );
  const { data } = state;
  const params = new URLSearchParams(query);
  const filtered = ['q', 'platform', 'workplaceType', 'location', 'sourceId'].some((key) =>
    params.get(key)?.trim(),
  );
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    next.set('page', String(page));
    return `/jobs?${next}`;
  };
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <section aria-label="Resultados da pesquisa" aria-live="polite">
      <div className="results-heading">
        <p>
          <strong>{data.total}</strong>{' '}
          {data.total === 1 ? 'oportunidade encontrada' : 'oportunidades encontradas'}
        </p>
        <span>Identificadas mais recentemente</span>
      </div>
      {data.items.length ? (
        <ul className="jobs-list">
          {data.items.map((job) => (
            <JobCard job={job} key={job.id} />
          ))}
        </ul>
      ) : (
        <div className="jobs-state">
          <span className="empty-icon" aria-hidden="true">
            ◎
          </span>
          <h2>
            {data.total > 0
              ? 'Esta página não tem resultados'
              : filtered
                ? 'Nenhum resultado para estes filtros'
                : 'Ainda não há vagas armazenadas'}
          </h2>
          <p>
            {data.total > 0
              ? 'Volte à primeira página para ver as oportunidades disponíveis.'
              : filtered
                ? 'Experimente outro termo, plataforma ou localização.'
                : 'Execute a sincronização local de uma fonte habilitada para começar.'}
          </p>
          {filtered || data.total > 0 ? (
            <Link href={data.total > 0 ? pageHref(1) : '/jobs'} className="text-link">
              {data.total > 0 ? 'Ir para a primeira página' : 'Limpar filtros'}
            </Link>
          ) : (
            <code>pnpm sync:jobs</code>
          )}
        </div>
      )}
      {data.total > 0 && (
        <nav className="pagination" aria-label="Paginação de vagas">
          {data.page > 1 ? (
            <Link prefetch={false} scroll={false} href={pageHref(data.page - 1)}>
              ← Anterior
            </Link>
          ) : (
            <span aria-disabled="true">← Anterior</span>
          )}
          <p>
            Página <strong>{data.page}</strong> de {pages}
          </p>
          {data.page < pages ? (
            <Link prefetch={false} scroll={false} href={pageHref(data.page + 1)}>
              Próxima →
            </Link>
          ) : (
            <span aria-disabled="true">Próxima →</span>
          )}
        </nav>
      )}
    </section>
  );
}

export function JobsBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.toString();
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const key of ['q', 'platform', 'workplaceType', 'location']) {
      const value = String(form.get(key) ?? '')
        .normalize('NFC')
        .trim();
      if (value) next.set(key, value);
    }
    for (const key of ['sourceId', 'pageSize']) {
      const value = params.get(key);
      if (value) next.set(key, value);
    }
    router.push(`/jobs${next.size ? `?${next}` : ''}`, { scroll: false });
  }
  return (
    <>
      <form
        className="jobs-filters"
        onSubmit={search}
        key={`filters:${query}`}
        role="search"
        aria-label="Pesquisar vagas"
      >
        <div className="search-row">
          <div className="field grow">
            <label htmlFor="q">O que você procura?</label>
            <input
              id="q"
              name="q"
              type="search"
              maxLength={200}
              defaultValue={params.get('q') ?? ''}
              placeholder="Cargo, tecnologia ou palavra-chave"
            />
          </div>
          <button className="primary-button" type="submit">
            Buscar oportunidades <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="filter-row">
          <div className="field">
            <label htmlFor="platform">Plataforma</label>
            <select id="platform" name="platform" defaultValue={params.get('platform') ?? ''}>
              <option value="">Todas as plataformas</option>
              {Object.entries(platforms).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="workplaceType">Modalidade</label>
            <select
              id="workplaceType"
              name="workplaceType"
              defaultValue={params.get('workplaceType') ?? ''}
            >
              <option value="">Todas as modalidades</option>
              {Object.entries(workplaces).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="location">Localização</label>
            <input
              id="location"
              name="location"
              maxLength={100}
              defaultValue={params.get('location') ?? ''}
              placeholder="Cidade, estado ou país"
            />
          </div>
          <Link href="/jobs" className="clear-filters">
            Limpar filtros
          </Link>
        </div>
      </form>
      <Results query={query} key={`results:${query}`} />
    </>
  );
}
