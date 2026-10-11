import Link from 'next/link';
import { Suspense } from 'react';
import { SiteHeader } from '../../components/site-header';
import { SourcesBrowser } from '../../components/sources-browser';
import { ReadLoading } from '../../components/read-state';

export const metadata = { title: 'Histórico de sincronizações | InternRadar' };
export default function History() {
  return (
    <div className="site-shell min-h-screen">
      <SiteHeader current="sources" />
      <main id="main" tabIndex={-1} className="jobs-main">
        <Link href="/sources" className="back-link">
          ← Voltar às fontes
        </Link>
        <section className="jobs-intro">
          <p className="eyebrow">CADA TENTATIVA, UM REGISTRO</p>
          <h1>
            Histórico <span>de sincronizações.</span>
          </h1>
          <p>Resultados, contagens e execuções ainda sem confirmação de conclusão.</p>
        </section>
        <Suspense fallback={<ReadLoading />}>
          <SourcesBrowser history />
        </Suspense>
      </main>
    </div>
  );
}
