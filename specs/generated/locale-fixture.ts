/**
 * Locale state injection — wired into the sungen base test fixture.
 *
 * Reads `specs/locale-config.json` (managed by the `/sungen:locale` skill)
 * and uses `addInitScript` + `addCookies` to seed any sessionStorage /
 * localStorage / cookie values that the app uses to remember locale.
 *
 * Active only when `SUNGEN_ENV` is set. When unset (default base-locale
 * runs), every call is a no-op so existing test suites are unaffected.
 *
 * Auto-managed by `/sungen:locale` — edit `specs/locale-config.json`
 * rather than this file. If the schema needs to change, update the skill
 * `sungen-locale` so future captures stay in sync.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { BrowserContext } from '@playwright/test';

interface LocaleCookie {
  name: string;
  value: string;
  domain?: string;
  url?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

interface LocaleInjection {
  /** Values to write into `sessionStorage` via `addInitScript`. */
  sessionStorage?: Record<string, string>;
  /** Values to write into `localStorage` via `addInitScript`. */
  localStorage?: Record<string, string>;
  /** Cookies to set via `context.addCookies`. Either `domain` or `url` is required. */
  cookies?: LocaleCookie[];
  /** Optional notes from `/sungen:locale` capture — informational only. */
  notes?: string;
}

let cached: LocaleInjection | null | undefined;

function loadLocaleConfig(): LocaleInjection | null {
  if (cached !== undefined) return cached;
  try {
    const cfgPath = path.join(__dirname, 'locale-config.json');
    if (!fs.existsSync(cfgPath)) {
      cached = null;
      return null;
    }
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as LocaleInjection;
    cached = parsed;
    return parsed;
  } catch {
    cached = null;
    return null;
  }
}

function interpolate(value: string, locale: string): string {
  return value.replace(/\$\{SUNGEN_ENV\}/g, locale).replace(/\{\{SUNGEN_ENV\}\}/g, locale);
}

/**
 * Apply locale state to a freshly-created BrowserContext.
 * Must be called BEFORE the first page navigation so the `addInitScript`
 * runs ahead of any app code that reads storage on boot.
 *
 * No-op when `SUNGEN_ENV` is unset or `specs/locale-config.json` is missing.
 */
export async function applyLocaleInjection(context: BrowserContext): Promise<void> {
  const locale = process.env.SUNGEN_ENV;
  if (!locale) return;
  const cfg = loadLocaleConfig();
  if (!cfg) return;

  const sessionEntries = Object.entries(cfg.sessionStorage ?? {}).map(
    ([k, v]) => [k, interpolate(String(v), locale)] as const,
  );
  const localEntries = Object.entries(cfg.localStorage ?? {}).map(
    ([k, v]) => [k, interpolate(String(v), locale)] as const,
  );

  if (sessionEntries.length || localEntries.length) {
    await context.addInitScript(
      ({ sessionEntries, localEntries }) => {
        for (const [k, v] of sessionEntries) sessionStorage.setItem(k, v);
        for (const [k, v] of localEntries) localStorage.setItem(k, v);
      },
      { sessionEntries, localEntries },
    );
  }

  if (cfg.cookies?.length) {
    await context.addCookies(
      cfg.cookies.map((c) => ({
        ...c,
        value: interpolate(c.value, locale),
        path: c.path ?? '/',
      })),
    );
  }
}
