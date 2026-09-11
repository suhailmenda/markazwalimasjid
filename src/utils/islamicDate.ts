export interface IslamicDateCache {
  date?: string;
  time?: string;
  day?: number;
  month?: string;
  year?: number;
  islamicDate: string;
}

export const HIJRI_MONTHS = [
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

export const parseIslamicDateString = (
  str: string
): { day: number; month: string; year: number } => {
  if (!str) return { day: 1, month: HIJRI_MONTHS[0], year: 1448 };
  const dayMatch = str.match(/^(\d{1,2})/);
  const day = dayMatch ? Math.min(30, Math.max(1, parseInt(dayMatch[1], 10))) : 1;

  const yearMatch = str.match(/(\d{4})/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : 1448;

  const foundMonth = HIJRI_MONTHS.find((m) => str.includes(m)) || HIJRI_MONTHS[0];
  return { day, month: foundMonth, year };
};

export const formatIslamicDate = (day: number, month: string, year: number): string => {
  return `${day} ${month} ${year} AH`;
};

export const advanceIslamicDate = (
  day: number,
  month: string,
  year: number
): { day: number; month: string; year: number; islamicDate: string } => {
  let nextDay = day + 1;
  let nextMonth = month;
  let nextYear = year;

  if (nextDay > 30) {
    nextDay = 1;
    const currentMonthIdx = HIJRI_MONTHS.indexOf(month);
    const nextMonthIdx = currentMonthIdx >= 0 ? (currentMonthIdx + 1) % 12 : 0;
    nextMonth = HIJRI_MONTHS[nextMonthIdx];
    if (nextMonthIdx === 0) {
      nextYear += 1;
    }
  }

  return {
    day: nextDay,
    month: nextMonth,
    year: nextYear,
    islamicDate: formatIslamicDate(nextDay, nextMonth, nextYear),
  };
};

