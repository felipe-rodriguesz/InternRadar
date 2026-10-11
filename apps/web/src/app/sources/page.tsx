import { Suspense } from 'react';
import { SiteHeader } from '../../components/site-header';
import { SourcesBrowser } from '../../components/sources-browser';
import { ReadLoading } from '../../components/read-state';

export const metadata = { title: 'Fontes monitoradas | InternRadar' };
export default function Sources() {
  return (
    <div className="site-shell min-h-screen">
      <SiteHeader current="sources" />
      <main id="main" tabIndex={-1} className="jobs-main">
        <section className="jobs-intro">
          <p className="eyebrow">
            <span className="accent-line" /> TRANSPARÊNCIA NA COLETA
          </p>
          <h1>
            As fontes <span>do seu radar.</span>
          </h1>
          <p>Saiba de onde vêm as oportunidades e como foi a última tentativa de coleta.</p>
          <p className="scope-note">
            Um sucesso anterior não garante que a última tentativa funcionou. Nenhuma sincronização
            é iniciada por esta página.
          </p>
        </section>
        <Suspense fallback={<ReadLoading />}>
          <SourcesBrowser />
        </Suspense>
      </main>
    </div>
  );
}
