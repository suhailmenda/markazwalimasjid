/**
 * Utility for formatting 24-hour / raw time strings into 12-hour AM/PM display strings (e.g. "1:25 pm", "5:15 am").
 */
export const formatTo12HourDisplay = (timeStr?: string): string => {
  if (!timeStr || timeStr === '-' || timeStr === 'After Azaan') return timeStr || '-';

  const amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)$/i);
  if (amPmMatch) {
    return `${parseInt(amPmMatch[1], 10)}:${amPmMatch[2]} ${amPmMatch[3].toLowerCase()}`;
  }

  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;

  return `${hours}:${minutes} ${period}`;
};

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