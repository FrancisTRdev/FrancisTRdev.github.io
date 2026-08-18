'use client'; // keep if you're in Next.js; safe elsewhere

import { useEffect } from "react";

export type ThemeWindow = {
  start: string | Date;                 // allow Date or string
  end: string | Date;                   // end is exclusive
  vars: Record<`--${string}`, string>;  // CSS variables to set while active
  notificationPopUp: string;
};

type Props = {
  windows: ThemeWindow[];
  defaults?: Record<`--${string}`, string>;
  tickMs?: number;
  strict?: boolean;
  allKeys?: Array<`--${string}`>;
  /** Log evaluations to console */
  debug?: boolean;
  /** How to normalize bare "YYYY-MM-DD" strings: local (default) or utc */
  mode?: "local" | "utc";
};

export default function ThemeScheduler({
  windows,
  defaults = {},
  tickMs = 1000,
  strict = false,
  allKeys = [],
  debug = false,
  mode = "local",
}: Props) {
  useEffect(() => {
    const rootStyle = document.documentElement.style;

    const removeKeys = (keys: Array<`--${string}`>) => {
      for (const key of keys) rootStyle.removeProperty(key);
    };

    const applyVars = (vars: Record<`--${string}`, string>) => {
      if (strict && allKeys.length) removeKeys(allKeys);
      for (const [k, v] of Object.entries(vars)) {
        rootStyle.setProperty(k, v);
      }
    };

    // Robust parse:
    // - Date object: return its time
    // - String with 'T' time or trailing 'Z': trust native Date parsing
    // - Bare 'YYYY-MM-DD': normalize to *midnight* in either local or UTC
    const parseWhen = (d: string | Date): number => {
      if (d instanceof Date) return d.getTime();

      if (/\dT\d/.test(d) || /Z$/i.test(d)) {
        const t = new Date(d).getTime();
        return t;
      }

      // Bare date → normalize
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
      if (!m) return NaN;
      const [_, yy, mm, dd] = m;
      const y = Number(yy), mon = Number(mm), day = Number(dd);
      if (mode === "utc") return Date.UTC(y, mon - 1, day, 0, 0, 0, 0);
      return new Date(y, mon - 1, day, 0, 0, 0, 0).getTime();
    };

    const check = () => {
      const now = Date.now();
      let active: Record<`--${string}`, string> | null = null;
      let chosen: ThemeWindow | null = null;

      for (const w of windows) {
        const start = parseWhen(w.start);
        const end = parseWhen(w.end);

        const ok = Number.isFinite(start) && Number.isFinite(end);
        const isActive = ok && now >= start && now < end;

        if (debug) {
          // eslint-disable-next-line no-console
          console.log("[ThemeScheduler]",
            {
              nowISO: new Date(now).toISOString(),
              startISO: Number.isFinite(start) ? new Date(start).toISOString() : "Invalid",
              endISO: Number.isFinite(end) ? new Date(end).toISOString() : "Invalid",
              active: isActive
            }
          );
        }

        if (isActive) {
          active = w.vars;
          chosen = w;
          break; // first match wins
        }
      }

      if (active) {
        applyVars(active);
        if (debug) {
          // eslint-disable-next-line no-console
          console.log("[ThemeScheduler] applied vars:", chosen?.vars);
        }
      } else {
        applyVars(defaults);
        if (debug) {
          // eslint-disable-next-line no-console
          console.log("[ThemeScheduler] no active window → defaults applied:", defaults);
        }
      }
    };

    check();
    const t = setInterval(check, tickMs);
    return () => clearInterval(t);
  }, [windows, defaults, tickMs, strict, allKeys, debug, mode]);

  return null;
}