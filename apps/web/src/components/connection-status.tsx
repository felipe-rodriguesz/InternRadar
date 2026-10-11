'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchHealth } from '../lib/health';
import type { Health } from '../lib/health';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; health: Health; checkedAt: Date };

export function ConnectionStatus() {
  const [state, setState] = useState<State>({ status: 'loading' });
  const request = useRef<AbortController | null>(null);

  function check(controller: AbortController) {
    void fetchHealth(controller.signal).then(
      (health) => {
        if (!controller.signal.aborted)
          setState({ status: 'success', health, checkedAt: new Date() });
      },
      () => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      },
    );
  }

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    void check(controller);
    return () => {
      request.current?.abort();
    };
  }, []);

  function retry() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'loading' });
    void check(controller);
  }

  const title =
    state.status === 'loading'
      ? 'Verificando conexão…'
      : state.status === 'success'
        ? 'Conexão estabelecida'
        : 'Não foi possível conectar';

  return (
    <section className="connection-panel" aria-labelledby="connection-title">
      <div className="panel-heading">
        <span className="eyebrow">AMBIENTE LOCAL</span>
        <span className="terminal-mark" aria-hidden="true">
          ⌁
        </span>
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-busy={state.status === 'loading'}
      >
        <div className={`connection-indicator ${state.status}`} aria-hidden="true">
          <span />
        </div>
        <h2 id="connection-title">{title}</h2>
        <p className="status-description">
          {state.status === 'loading'
            ? 'Consultando a API do InternRadar.'
            : state.status === 'success'
              ? 'O InternRadar está respondendo. A base para suas próximas descobertas está pronta.'
              : 'Não recebemos uma resposta válida. Confira se a API está em execução e tente novamente.'}
        </p>
        <dl className="service-list">
          <div>
            <dt>API InternRadar</dt>
            <dd>
              {state.status === 'success'
                ? 'Disponível'
                : state.status === 'loading'
                  ? 'Verificando'
                  : 'Indisponível'}
            </dd>
          </div>
          <div>
            <dt>PostgreSQL</dt>
            <dd>
              {state.status === 'success' && state.health.database.status === 'connected'
                ? 'Conexão verificada'
                : 'Não confirmado'}
            </dd>
          </div>
        </dl>
        <p className="checked-at">
          {state.status === 'success'
            ? `Verificado às ${state.checkedAt.toLocaleTimeString('pt-BR')}`
            : 'O estado é confirmado por uma consulta real.'}
        </p>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={state.status === 'loading'}
        className="verify-button"
      >
        {state.status === 'loading' ? 'Verificando…' : 'Verificar novamente'}
        <span aria-hidden="true">↗</span>
      </button>
    </section>
  );
}
