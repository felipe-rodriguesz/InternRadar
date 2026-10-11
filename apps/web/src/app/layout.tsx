import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'InternRadar — O próximo passo começa aqui',
  description: 'Uma visão organizada das suas próximas oportunidades de estágio em tecnologia.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
