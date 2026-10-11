'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { fetchDetail } from '../lib/catalog';
import { safeExternalUrl } from '../lib/jobs';
import { DateTime, ReadError, ReadLoading, useRead } from './read-state';

export function JobDetail({ id }: { id: string }) {
  const { state, retry } = useRead(fetchDetail, id);
  const params = useSearchParams();
  const from = params.get('from');
  // Internal path only; never turn an untrusted query into an open redirect.
  const back = from && (from === '/jobs' || from.startsWith('/jobs?')) ? from : '/jobs';
  if (state.type === 'loading') return <ReadLoading />;
  if (state.type === 'error') return <ReadError kind={state.kind} retry={retry} />;
  const job = state.data;
  const original = safeExternalUrl(job.jobUrl);
  const workplaces = {
    REMOTE: 'Remota',
    HYBRID: 'Híbrida',
    ONSITE: 'Presencial',
    UNKNOWN: 'Não informada',
  };
  const statuses = {
    ACTIVE: 'Identificada na fonte',
    POSSIBLY_CLOSED: 'Possivelmente encerrada',
    CLOSED: 'Encerrada',
  };
  return (
    <>
      <Link className="back-link" href={back}>
        ← Voltar à listagem
      </Link>
      <article className="detail-layout">
        <div className="detail-content">
          <header className="detail-heading">
            <p className="eyebrow">{job.company.name}</p>
            <span className="source-badge">{job.source.platform}</span>
            <h1>{job.title}</h1>
            <div className="job-facts">
              <span>{job.location ?? 'Localização não informada'}</span>
              <span>Modalidade: {workplaces[job.workplaceType]}</span>
              {job.employmentType && <span>{job.employmentType}</span>}
            </div>
          </header>
          <section className="description-panel" aria-labelledby="description-title">
            <h2 id="description-title">Sobre a oportunidade</h2>
            <p className="job-description">
              {job.description ?? 'A fonte não informou uma descrição para esta oportunidade.'}
            </p>
          </section>
        </div>
        <aside className="detail-aside" aria-label="Origem e disponibilidade">
          <p className="eyebrow">NA ORIGEM</p>
          <h2>{statuses[job.status]}</h2>
          <p>
            O registro reflete a última coleta. Confirme a disponibilidade e os requisitos no
            anúncio original.
          </p>
          {!job.isListed && (
            <p className="visibility-note">
              A fonte marcou este anúncio como não listado. Ele está oculto na busca padrão.
            </p>
          )}
          <dl className="metadata-list">
            <div>
              <dt>Identificada pelo InternRadar</dt>
              <dd>
                <DateTime value={job.firstSeenAt} />
              </dd>
            </div>
            <div>
              <dt>Última identificação na fonte</dt>
              <dd>
                <DateTime value={job.lastSeenAt} />
              </dd>
            </div>
            <div>
              <dt>Publicação informada pela fonte</dt>
              <dd>
                {job.publishedAt ? (
                  <DateTime value={job.publishedAt} />
                ) : (
                  'Data de publicação não informada'
                )}
              </dd>
            </div>
          </dl>
          {original ? (
            <a
              className="primary-button original-button"
              href={original}
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar anúncio original <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <p className="invalid-link">Link original indisponível</p>
          )}
          <p className="scope-note">
            A candidatura acontece fora do InternRadar, no site da oportunidade.
          </p>
        </aside>
      </article>
    </>
  );
}
