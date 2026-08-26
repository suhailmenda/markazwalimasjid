/**
 * Shared TypeScript types for the Markaz Wali Masjid app.
 */

// ── Prayer time entries ────────────────────────────────────────────────────

export interface PrayerTimeEntry {
  adhan: string;
  jamat: string;
}

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jummah' | 'Ishraq' | 'Chast';
export type TimeType = 'adhan' | 'jamat';

export type ManualTimes = Record<PrayerName, PrayerTimeEntry>;

// ── Aladhan API response types ─────────────────────────────────────────────

export interface AladhanTimings {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Sunset: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
  [key: string]: string; // allow extra keys the API may return
}

export interface AladhanHijriMonth {
  number: number;
  en: string;
  ar: string;
  days?: number;
}

export interface AladhanHijriDate {
  date: string;
  format: string;
  day: string;
  month: AladhanHijriMonth;
  year: string;
  designation: {
    abbreviated: string;
    expanded: string;
  };
  holidays?: string[];
}

export interface AladhanDate {
  readable: string;
  timestamp: string;
  hijri: AladhanHijriDate;
  gregorian?: {
    date: string;
    format: string;
    day: string;
    month: { number: number; en: string };
    year: string;
  };
}

export interface AladhanApiResponse {
  code: number;
  status: string;
  data: {
    timings: AladhanTimings;
    date: AladhanDate;
  };
}

// ── Hook state ─────────────────────────────────────────────────────────────

export type SaveStatus = 'saved' | 'saving' | 'error' | 'local';

export interface UsePrayerTimesReturn {
  prayerTimes: AladhanTimings | null;
  apiDate: AladhanDate | null;
  apiIslamicDate: string;
  manualTimes: ManualTimes;
  loading: boolean;
  saveStatus: SaveStatus;
  isFirebaseConfigured: boolean;
  manualIslamicDate: string;
  updateManualTime: (prayer: PrayerName, type: TimeType, value: string) => Promise<void>;
  saveAllSettings: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
  syncApiTimesNow: () => Promise<void>;
}
