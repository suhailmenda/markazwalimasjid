/**
 * Utility for formatting 24-hour / raw time strings into 12-hour AM/PM display strings (e.g. "1:25 pm", "5:15 am").
 */

export const formatTo12HourDisplay = (timeStr?: string): string => {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  const clean = timeStr.trim();
  if (clean === '-' || clean === 'After Azaan') return clean;

  // If string already contains AM/PM (case insensitive)
  const amPmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)$/i);
  if (amPmMatch) {
    const hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2];
    const period = amPmMatch[3].toLowerCase();
    return `${hours}:${minutes} ${period}`;
  }

  // If 24-hour format "HH:MM"
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = hours >= 12 ? 'pm' : 'am';

  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours = hours - 12;
  }

  return `${hours}:${minutes} ${period}`;
};

/**
 * Utility functions for Sunset (Maghrib) Scheduling & Islamic Date Transition
 *
 * In Islamic calendar, a new day begins at Sunset (Maghrib).
 * If currentTime >= Maghrib time today, the Islamic date advances by +1 day.
 */

/**
 * Parses any 12-hour ("7:04 pm") or 24-hour ("19:04") time string into a Date object for today.
 */
export const parseTimeToToday = (timeStr?: string, referenceDate: Date = new Date()): Date | null => {
    if (!timeStr || typeof timeStr !== 'string') return null;

    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');

    const match = clean.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

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