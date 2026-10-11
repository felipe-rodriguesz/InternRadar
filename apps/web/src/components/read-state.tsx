'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { JobsError } from '../lib/jobs';

export function useRead<T>(load: (key: string, signal: AbortSignal) => Promise<T>, key: string) {
  const [state, setState] = useState<
    { type: 'loading' } | { type: 'success'; data: T } | { type: 'error'; kind: JobsError['kind'] }
  >({ type: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void load(key, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ type: 'success', data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({ type: 'error', kind: error instanceof JobsError ? error.kind : 'contract' });
      });
    return () => controller.abort();
  }, [load, key, attempt]);
  return {
    state,
    retry: () => {
      setState({ type: 'loading' });
      setAttempt((n) => n + 1);
    },
  };
}
export function ReadLoading() {
  return (
    <div className="jobs-state" role="status">
      <span className="radar-loader" aria-hidden="true">
        ◎
      </span>
      <p>Carregando informações…</p>
    </div>
  );
}
export function ReadError({ kind, retry }: { kind: JobsError['kind']; retry: () => void }) {
  return (
    <section className="jobs-state error-state" role="alert">
      <h2>
        {kind === 'notfound'
          ? 'Vaga não encontrada'
          : kind === 'query'
            ? 'Endereço ou filtros inválidos'
            : kind === 'connection'
              ? 'Não foi possível conectar à API'
              : 'Não foi possível carregar as informações'}
      </h2>
      <p>
        {kind === 'notfound'
          ? 'Este identificador não corresponde a uma vaga armazenada.'
          : 'Confira o endereço ou tente novamente em instantes.'}
      </p>
      <div className="state-actions">
        {kind !== 'notfound' && (
          <button className="primary-button" onClick={retry}>
            Tentar novamente
          </button>
        )}
        <Link href="/jobs" className="text-link">
          Voltar à listagem
        </Link>
      </div>
    </section>
  );
}
export function DateTime({ value }: { value: string | null }) {
  return value ? (
    <time dateTime={value}>
      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )}
    </time>
  ) : (
    <>Não informado</>
  );
}
