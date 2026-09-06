import { parseTimeToToday } from './timeFormat';

export interface IslamicDateCache {
  date: string;
  time: string;
  islamicDate: string;
}

const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Thaniyah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

/**
 * Computes the Islamic (Hijri) date completely offline using standard ECMAScript Intl API.
 * In the Islamic calendar, a new day begins at Sunset (Maghrib).
 * If currentTime >= Maghrib time today, the date advances by +1 day.
 */
export const calculateIslamicDate = (
  currentTime: Date,
  maghribTimeStr: string
): string => {
  const targetDate = new Date(currentTime);
  const maghribDate = parseTimeToToday(maghribTimeStr, currentTime);

  if (maghribDate && currentTime >= maghribDate) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });

  const parts = formatter.formatToParts(targetDate);
  const day = parts.find((p) => p.type === 'day')?.value || '1';
  const monthNum = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const year = parts.find((p) => p.type === 'year')?.value || '1448';

  const monthName = HIJRI_MONTHS[monthNum - 1] || 'Muharram';
  return `${day} ${monthName} ${year} AH`;
};
