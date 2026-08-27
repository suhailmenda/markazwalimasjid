/**
 * Shared TypeScript types & default constants for the Markaz Wali Masjid app.
 */

export interface PrayerTimeEntry {
  adhan: string;
  jamat: string;
}

export type PrayerName = 'Fajr' | 'Ishraq' | 'Chast' | 'Dhuhr' | 'Asr' | 'Maghrib' | 'Isha' | 'Jummah';
export type TimeType = 'adhan' | 'jamat';

export type ManualTimes = Record<PrayerName, PrayerTimeEntry>;

export const DEFAULT_TIMES: ManualTimes = {
  Fajr: { adhan: '05:15 am', jamat: '05:45 am' },
  Ishraq: { adhan: '-', jamat: '-' },
  Chast: { adhan: '-', jamat: '-' },
  Dhuhr: { adhan: '12:45 pm', jamat: '01:30 pm' },
  Asr: { adhan: '04:45 pm', jamat: '05:15 pm' },
  Maghrib: { adhan: '07:04 pm', jamat: 'After Azaan' },
  Isha: { adhan: '08:30 pm', jamat: '09:00 pm' },
  Jummah: { adhan: '01:00 pm', jamat: '01:30 pm' },
};

export interface UsePrayerTimesReturn {
  manualTimes: ManualTimes;
  manualIslamicDate: string;
  loading: boolean;
  saveAllSettings: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
}
