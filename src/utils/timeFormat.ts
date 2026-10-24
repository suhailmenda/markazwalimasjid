
// Indian Standard Time (IST) is UTC+05:30 with no daylight saving time.
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns a Date object shifted by the IST offset (+5:30).
 * Using UTC getters (getUTCFullYear, getUTCMonth, getUTCDate, getUTCHours, getUTCMinutes, getUTCSeconds)
 * on this date returns the exact wall-clock time in Silvassa (IST) regardless of the client's local timezone.
 */
export const getISTDate = (date: Date = new Date()): Date => {
  return new Date(date.getTime() + IST_OFFSET_MS);
};

/**
 * Parses any 12-hour ("7:04 pm") or 24-hour ("19:04") time string into a Date object
 * corresponding to that prayer time in Silvassa (IST).
 */
export const parseTimeToToday = (timeStr: string, referenceDate: Date = new Date()): Date => {
  const clean = timeStr.trim();
  const isPM = clean.toUpperCase().includes('PM');
  const isAM = clean.toUpperCase().includes('AM');

  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return new Date(referenceDate);

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) {
    hours += 12;
  } else if (isAM && hours === 12) {
    hours = 0;
  }

  const istRef = getISTDate(referenceDate);
  const targetEpoch = Date.UTC(
    istRef.getUTCFullYear(),
    istRef.getUTCMonth(),
    istRef.getUTCDate(),
    hours,
    minutes,
    0,
    0,
  ) - IST_OFFSET_MS;

  return new Date(targetEpoch);
};