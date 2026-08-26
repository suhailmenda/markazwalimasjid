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

const prayerTimesData = prayerTimesDataJson as Record<string, DayJsonEntry>;

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
      start: formatTo12HourDisplay(entry.subahSadiq || entry.fajr),
      end: formatTo12HourDisplay(entry.tulu),
    },
    Ishraq: {
      start: formatTo12HourDisplay(entry.ishraqStart || '07:00'),
      end: formatTo12HourDisplay(entry.ishraqEnd || '10:00'),
    },
    Chast: {
      start: formatTo12HourDisplay(entry.chashtStart || '10:00'),
      end: formatTo12HourDisplay(entry.chashtEnd || '12:25'),
    },
    Dhuhr: {
      start: formatTo12HourDisplay(entry.zawal),
      end: formatTo12HourDisplay(entry.asr),
    },
    Asr: {
      start: formatTo12HourDisplay(entry.asr),
      end: formatTo12HourDisplay(entry.sunset || entry.maghrib),
    },
    Maghrib: {
      start: formatTo12HourDisplay(entry.maghrib || entry.sunset),
      end: formatTo12HourDisplay(entry.isha),
    },
    Isha: {
      start: formatTo12HourDisplay(entry.isha),
      end: formatTo12HourDisplay(entry.subahSadiq || entry.sehriEnd),
    },
    Jummah: {
      start: '-',
      end: '-',
    },
  };

  return { map, raw: entry };
};
