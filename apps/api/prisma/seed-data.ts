// Boards públicos verificados em 11/10/2026; evidências em docs/seed-sources.md.
// UUIDs internos estáveis não são identificadores fornecidos pelas plataformas.
export const seedSources = [
  {
    companyId: '7335971e-b7c7-4c68-ad3c-e339de986848',
    name: 'Figma',
    websiteUrl: 'https://www.figma.com',
    platform: 'GREENHOUSE',
    boardKey: 'figma',
    region: 'GLOBAL',
  },
  {
    companyId: '00e2caac-53a5-4f72-9c52-8eaa48f021a0',
    name: 'Spotify',
    websiteUrl: 'https://www.spotify.com',
    platform: 'LEVER',
    boardKey: 'spotify',
    region: 'GLOBAL',
  },
  {
    companyId: 'a64c4ca0-fbbf-4bd8-932e-6572375138af',
    name: 'Ashby',
    websiteUrl: 'https://www.ashbyhq.com',
    platform: 'ASHBY',
    boardKey: 'Ashby',
    region: 'GLOBAL',
  },
] as const;
