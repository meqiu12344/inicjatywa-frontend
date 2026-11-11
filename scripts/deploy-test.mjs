// Build i deploy środowiska testowego (worker inicjatywa-frontend-test, test.inicjatywakatolicka.pl).
// Zmienne poniżej nadpisują .env.local (Next nie nadpisuje zmiennych już ustawionych w procesie).
// Użycie: npm run deploy:test
import { spawnSync } from 'node:child_process';

const BACKEND = 'https://api-test.inicjatywakatolicka.pl';

const env = {
  ...process.env,
  NEXT_PUBLIC_APP_ENV: 'test',
  BACKEND_URL: BACKEND,
  NEXT_PUBLIC_API_URL: BACKEND,
  NEXT_PUBLIC_API_BASE_URL: BACKEND,
  // Puste ID = brak tagów (i tak wyłączone przez NEXT_PUBLIC_APP_ENV=test).
  NEXT_PUBLIC_GA_MEASUREMENT_ID: '',
  NEXT_PUBLIC_GOOGLE_ADS_ID: '',
  NEXT_PUBLIC_META_PIXEL_ID: '',
};

const run = (args) => {
  // Jeden string zamiast tablicy argumentów: na Windows npx wymaga powłoki (bez ostrzeżenia DEP0190).
  const result = spawnSync(`npx opennextjs-cloudflare ${args.join(' ')}`, { stdio: 'inherit', env, shell: true });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(['build']);
run(['deploy', '--env', 'test']);
