import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env.local into process.env (best-effort). This lets tests read
// MONGODB_URI / AUTH_SECRET / Google OAuth creds without duplicating them.
try {
  const envPath = join(process.cwd(), '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local missing — assume env vars are already set by the caller
}

// Override DB to a separate test database so tests never touch dev data
process.env.MONGODB_DB = 'household-tracker-test';