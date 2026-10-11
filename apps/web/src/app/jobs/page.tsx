import { SiteHeader } from '../../components/site-header';
import { Suspense } from 'react';
import { JobsBrowser, JobsLoading } from '../../components/jobs-browser';

export const metadata = {
  title: 'Oportunidades | InternRadar',
  description: 'Pesquise oportunidades das fontes monitoradas pelo InternRadar.',
};

export default function Jobs() {
  return (
    <div className="site-shell min-h-screen">
      <SiteHeader current="jobs" />
      <main id="main" className="jobs-main">
        <section className="jobs-intro">
          <p className="eyebrow">
            <span className="accent-line" />
            EXPLORE SEU PRÓXIMO PASSO
          </p>
          <h1>
            Oportunidades <span>no radar.</span>
          </h1>
          <p>Encontre seu próximo caminho, com a origem sempre à vista.</p>
          <p className="scope-note">
            Anúncios das fontes monitoradas, de diferentes níveis e localidades. Use a busca para
            encontrar estágios; a presença na lista não confirma inscrições abertas.
          </p>
        </section>
        <Suspense fallback={<JobsLoading />}>
          <JobsBrowser />
        </Suspense>
      </main>
      <footer>
        <p>
          InternRadar <span>—</span> Seu futuro no radar.
        </p>
        <p>A candidatura acontece no site original.</p>
      </footer>
    </div>
  );
}
