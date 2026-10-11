import Link from 'next/link';

export function SiteHeader({ current }: { current?: 'jobs' | 'sources' }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="InternRadar, início">
          <span className="brand-icon" aria-hidden="true">
            ◎
          </span>
          Intern<span>Radar</span>
          <span className="brand-dot">.</span>
        </Link>
        <nav className="header-nav" aria-label="Principal">
          <Link href="/jobs" aria-current={current === 'jobs' ? 'page' : undefined}>
            Oportunidades
          </Link>
          <Link href="/sources" aria-current={current === 'sources' ? 'page' : undefined}>
            Fontes
          </Link>
          <Link href="/">Saúde da API</Link>
        </nav>
      </header>
    </>
  );
}
