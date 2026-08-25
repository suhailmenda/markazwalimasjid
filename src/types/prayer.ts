/**
 * Shared TypeScript types for the Markaz Wali Masjid app.
 */

// ── Prayer time entries ────────────────────────────────────────────────────

export interface PrayerTimeEntry {
  adhan: string;
  jamat: string;
}

export type PrayerName = 'Fajr' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jummah';
export type TimeType = 'adhan' | 'jamat';

export type ManualTimes = Record<PrayerName, PrayerTimeEntry>;

// ── Aladhan API response timings ───────────────────────────────────────────

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

// ── Hook state ─────────────────────────────────────────────────────────────

export type SaveStatus = 'saved' | 'saving' | 'error' | 'local';

export interface UsePrayerTimesReturn {
  prayerTimes: AladhanTimings | null;
  manualTimes: ManualTimes;
  loading: boolean;
  saveStatus: SaveStatus;
  isFirebaseConfigured: boolean;
  manualIslamicDate: string;
  updateManualTime: (prayer: PrayerName, type: TimeType, value: string) => Promise<void>;
  saveAllSettings: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
}
