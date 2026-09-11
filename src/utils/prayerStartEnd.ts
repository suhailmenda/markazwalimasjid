import prayerTimesDataJson from '../assets/prayer_times.json';
import type { PrayerName } from '../types/prayer';

export interface DayJsonEntry {
  sehriEnd: string;
  subahSadiq: string;
  fajr: string;
  tulu: string;
  zawalStart: string;
  zawalEnd: string;
  asr: string;
  asrEnd: string;
  sunset: string;
  maghrib: string;
  isha: string;
  ishraqStart: string;
  ishraqEnd: string;
  chashtStart: string;
}

type PrayerTimesData = Record<string, DayJsonEntry>;

const prayerTimesData = prayerTimesDataJson as PrayerTimesData;

export interface PrayerStartEnd {
  start: string;
  end: string;
}

export type PrayerStartEndMap = Record<PrayerName, PrayerStartEnd>;

export const getTodayPrayerStartEndMap = (date: Date = new Date()): { map: PrayerStartEndMap; raw: DayJsonEntry } => {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const key = `${day}-${month}`; // e.g. "26-Aug"

  const entry = prayerTimesData[key];

  const map: PrayerStartEndMap = {
    Fajr: {
      start: entry.subahSadiq,
      end: entry.tulu,
    },
    Ishraq: {
      start: entry.ishraqStart,
      end: entry.ishraqEnd,
    },
    Chast: {
      start: entry.chashtStart,
      end: entry.zawalStart,
    },
    Dhuhr: {
      start: entry.zawalEnd,
      end: entry.asr,
    },
    Asr: {
      start: entry.asr,
      end: entry.asrEnd,
    },
    Maghrib: {
      start: entry.maghrib,
      end: entry.isha,
    },
    Isha: {
      start: entry.isha,
      end: entry.subahSadiq,
    },
    Jummah: {
      start: '-',
      end: '-',
    },
  };

  return { map, raw: entry };
};
