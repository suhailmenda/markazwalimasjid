import prayerTimesDataJson from '../assets/prayer_times.json';
import type { PrayerName } from '../types/prayer';
import { formatTo12HourDisplay } from './timeFormat';

export interface DayJsonEntry {
  sehriEnd: string;
  subahSadiq: string;
  fajr: string;
  tulu: string;
  zawal: string;
  asr: string;
  sunset: string;
  maghrib: string;
  isha: string;
  ishraqStart?: string;
  ishraqEnd?: string;
  chashtStart?: string;
  chashtEnd?: string;
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

  const entry = prayerTimesData[key] || prayerTimesData['01-Jan'];

  const map: PrayerStartEndMap = {
    Fajr: {
      start: formatTo12HourDisplay(entry.subahSadiq),
      end: formatTo12HourDisplay(entry.tulu),
    },
    Ishraq: {
      start: formatTo12HourDisplay(entry.ishraqStart),
      end: formatTo12HourDisplay(entry.ishraqEnd),
    },
    Chast: {
      start: formatTo12HourDisplay(entry.chashtStart),
      end: formatTo12HourDisplay(entry.chashtEnd),
    },
    Dhuhr: {
      start: formatTo12HourDisplay(entry.zawal),
      end: formatTo12HourDisplay(entry.asr),
    },
    Asr: {
      start: formatTo12HourDisplay(entry.asr),
      end: formatTo12HourDisplay(entry.sunset),
    },
    Maghrib: {
      start: formatTo12HourDisplay(entry.maghrib),
      end: formatTo12HourDisplay(entry.isha),
    },
    Isha: {
      start: formatTo12HourDisplay(entry.isha),
      end: formatTo12HourDisplay(entry.subahSadiq),
    },
    Jummah: {
      start: '-',
      end: '-',
    },
  };

  return { map, raw: entry };
};
