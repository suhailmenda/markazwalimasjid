
/**
 * Parses any 12-hour ("7:04 pm") or 24-hour ("19:04") time string into a Date object for today.
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

  const targetDate = new Date(referenceDate);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
};