import Link from 'next/link';
import { ConnectionStatus } from '../components/connection-status';

export default function Home() {
  return (
    <div className="site-shell min-h-screen">
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
        <span className="build-label">
          <span aria-hidden="true" />
          Em desenvolvimento
        </span>
      </header>
      <main id="main">
        <div className="hero-grid">
          <section className="hero-copy" aria-labelledby="hero-title">
            <p className="eyebrow">
              <span className="accent-line" />
              SEU PRÓXIMO PASSO EM TECNOLOGIA
            </p>
            <h1 id="hero-title">
              Menos abas.
              <br />
              Mais <span>possibilidades.</span>
            </h1>
            <p className="hero-description">
              Um lugar para encontrar e acompanhar oportunidades de estágio. Mais clareza na busca,
              mais tempo para construir seu caminho.
            </p>
            <div className="foundation-note">
              <span className="note-number">01 /</span>
              <p>
                Explore as fontes monitoradas.
                <br />
                <Link className="text-link" href="/jobs">
                  Buscar oportunidades →
                </Link>
              </p>
            </div>
          </section>
          <ConnectionStatus />
        </div>
        <section className="principles" aria-label="Propósito do projeto">
          <article>
            <span>01</span>
            <h2>Fontes públicas</h2>
            <p>Oportunidades com origem identificada e acesso ao anúncio original.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Informação com contexto</h2>
            <p>Uma busca organizada, com transparência sobre o que sabemos.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Você no controle</h2>
            <p>Um projeto pessoal que evolui junto com a sua jornada em tecnologia.</p>
          </article>
        </section>
      </main>
      <footer>
        <p>
          InternRadar <span>—</span> Seu futuro no radar.
        </p>
        <a href="https://github.com/felipe-rodriguesz/InternRadar">
          Conheça o projeto <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  );
}
