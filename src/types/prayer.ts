/**
 * Shared TypeScript types for the Markaz Wali Masjid app.
 */

export interface PrayerTimeEntry {
  adhan: string;
  jamat: string;
}

export type PrayerName = 'Fajr' | 'Ishraq' | 'Chast' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jummah';
export type TimeType = 'adhan' | 'jamat';

export type ManualTimes = Partial<Record<PrayerName, PrayerTimeEntry>>;

export interface UsePrayerTimesReturn {
  manualTimes: ManualTimes;
  islamicDate: string;
  loading: boolean;
  saveAllSettings: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
}
