import { Suspense } from 'react';
import { JobDetail } from '../../../components/job-detail';
import { ReadLoading } from '../../../components/read-state';
import { SiteHeader } from '../../../components/site-header';

export const metadata = { title: 'Detalhes da oportunidade | InternRadar' };
export default async function Details({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="site-shell min-h-screen">
      <SiteHeader current="jobs" />
      <main id="main" tabIndex={-1} className="jobs-main">
        <Suspense fallback={<ReadLoading />}>
          <JobDetail id={id} key={id} />
        </Suspense>
      </main>
    </div>
  );
}
