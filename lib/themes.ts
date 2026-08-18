import { ThemeWindow } from "@/components/ui/ThemeScheduler";

// Easter date helpers (Western/Gregorian)
export function getWesternEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = 1 + ((h + l - 7 * m + 114) % 31);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return startOfDay(copy);
}

export type HolidayWindow = ThemeWindow & {
  id: string;
  notificationPopUp?: string;
};

const YEAR = new Date().getFullYear();
const EASTER_SUNDAY = getWesternEaster(YEAR);
const DAY_AFTER_EASTER = addDays(EASTER_SUNDAY, 1);

export const HOLIDAY_WINDOWS: HolidayWindow[] = [
  {
    id: "valentines",
    start: new Date(YEAR, 1, 14, 0, 0, 0, 0),
    end: new Date(YEAR, 1, 15, 0, 0, 0, 0),
    vars: {
      "--shiny-color": "#ff00dd",
      "--shiny-color-light": "#ffbffa",
      "--primary-main-color": "305 100% 88%",
      "--card-main-bg": "319 49% 10%",
      "--skills-card-bg": "#260d1e",
      "--custom-cursor": "url('/cursorImg/Heart.ico') 16 16, auto",
    },
    notificationPopUp: "❤️ Happy Valentine's Day!",
  },
  {
    id: "st-patricks",
    start: new Date(YEAR, 2, 17, 0, 0, 0, 0),
    end: new Date(YEAR, 2, 18, 0, 0, 0, 0),
    vars: {
      "--shiny-color": "#00ff0dd0",
      "--shiny-color-light": "#9fffa2eb",
      "--primary-main-color": "122 100% 81%",
      "--card-main-bg": "122 49% 10%",
      "--skills-card-bg": "#0a1a0a",
      "--custom-cursor": "url('/cursorImg/Clover.ico') 16 16, auto",
    },
    notificationPopUp: "🍀 Happy St. Patrick's Day!",
  },
  {
    id: "easter",
    start: EASTER_SUNDAY,
    end: DAY_AFTER_EASTER,
    vars: {
      "--shiny-color": "#92fbff",
      "--shiny-color-light": "#d0c0ff",
      "--primary-main-color": "205 70% 78%",
      "--card-main-bg": "275 45% 12%",
      "--skills-card-bg": "#1e0d26",
      "--custom-cursor": "url('/cursorImg/Egg.ico') 16 16, auto",
    },
    notificationPopUp: "🐣 Happy Easter!",
  },
  {
    id: "halloween",
    start: new Date(YEAR, 9, 31, 0, 0, 0, 0),
    end: new Date(YEAR, 10, 1, 0, 0, 0, 0),
    vars: {
      "--shiny-color": "#ffa600ee",
      "--shiny-color-light": "#ffd47dee",
      "--primary-main-color": "40 100% 75%",
      "--card-main-bg": "38 49% 10%",
      "--skills-card-bg": "#1a130a",
      "--custom-cursor": "url('/cursorImg/Pumpkin.ico') 16 16, auto",
    },
    notificationPopUp: "👻 Happy Halloween!",
  },
  {
    id: "christmas",
    start: new Date(YEAR, 11, 25, 0, 0, 0, 0),
    end: new Date(YEAR, 11, 26, 0, 0, 0, 0),
    vars: {
      "--shiny-color": "#3cb300",
      "--shiny-color-light": "#ff7a7a",
      "--primary-main-color": "120 79% 40%",
      "--card-main-bg": "0 49% 10%",
      "--skills-card-bg": "#1a0d0d",
      "--custom-cursor": "url('/cursorImg/ChristmasTree.ico') 16 16, auto",
    },
    notificationPopUp: "🎄 Merry Christmas!",
  },
];

export const DEFAULT_THEME_VARS = {
  "--shiny-color": "#00ccff",
  "--shiny-color-light": "#cef5ff",
  "--primary-main-color": "193 100% 50%",
  "--card-main-bg": "222.2 50% 10%",
  "--skills-card-bg": "#0C1426",
};
