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

/**
 * Calculates the current Islamic (Hijri) Date automatically.
 * Rule: Before Maghrib = Today's Islamic Date.
 *       After Maghrib  = Next Day's Islamic Date (+1 day).
 */
export const getIslamicDateAtSunset = (
    currentTime: Date = new Date(),
    maghribTimeStr?: string
): string => {
    let dateToFormat = new Date(currentTime);

    if (maghribTimeStr) {
        const maghribDate = parseTimeToToday(maghribTimeStr, currentTime);
        if (maghribDate && currentTime >= maghribDate) {
            // Sunset reached: advance date by +1 day for the new Islamic day
            dateToFormat = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
        }
    }

    try {
        return new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Kolkata',
        }).format(dateToFormat);
    } catch (e) {
        try {
            return new Intl.DateTimeFormat('en-US-u-ca-islamic', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(dateToFormat);
        } catch (err) {
            return '';
        }
    }
};

/**
 * Calculates milliseconds remaining until today's or tomorrow's Maghrib.
 */
export const getMsUntilNextSunset = (
    maghribTimeStr?: string,
    currentTime: Date = new Date()
): number | null => {
    const maghribDate = parseTimeToToday(maghribTimeStr, currentTime);
    if (!maghribDate) return null;

    let diff = maghribDate.getTime() - currentTime.getTime();
    if (diff <= 0) {
        const tomorrowMaghrib = new Date(maghribDate.getTime() + 24 * 60 * 60 * 1000);
        diff = tomorrowMaghrib.getTime() - currentTime.getTime();
    }

    return diff;
};
