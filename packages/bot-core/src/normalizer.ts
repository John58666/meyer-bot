import { CODIGO_PATRONES } from './constants.js';

export function normalizar(raw: string): string {
  let t = String(raw).trim()
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .trim();

  for (const p of CODIGO_PATRONES) {
    const m = t.match(p);
    if (m) return m[0].trim();
  }

  return t;
}
