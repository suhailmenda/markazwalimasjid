/**
 * Utility functions for Sunset (Maghrib) Scheduling & Islamic Date Transition
 */

import type { AladhanTimings } from '../types/prayer';

/**
 * Parses a time string like "19:05", "19:05 (IST)", "07:05 PM" into a Date object for today.
 */
export const parseTimeToToday = (timeStr?: string, referenceDate: Date = new Date()): Date | null => {
    if (!timeStr || typeof timeStr !== 'string') return null;

    const cleanTime = timeStr.trim().split(' ')[0]; // e.g. "19:05"
    const match = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    const targetDate = new Date(referenceDate);
    targetDate.setHours(hours, minutes, 0, 0);
    return targetDate;
};

/**
 * Returns the formatted Islamic (Hijri) Date.
 * If the current time is AFTER Maghrib (sunset) on the current civil day,
 * the date is advanced by +1 day because the new Islamic day begins at sunset.
 */
export const getIslamicDateAtSunset = (
    currentTime: Date = new Date(),
    maghribTimeStr?: string
): string => {
    let dateToFormat = new Date(currentTime);

    if (maghribTimeStr) {
        const maghribDate = parseTimeToToday(maghribTimeStr, currentTime);
        if (maghribDate && currentTime >= maghribDate) {
            // After sunset: Advance date by +1 day for the new Islamic night/day
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
 * Calculates milliseconds until the next sunset (Maghrib time).
 * Returns null if Maghrib time cannot be parsed.
 */
export const getMsUntilNextSunset = (
    maghribTimeStr?: string,
    currentTime: Date = new Date()
): number | null => {
    const maghribDate = parseTimeToToday(maghribTimeStr, currentTime);
    if (!maghribDate) return null;

    let diff = maghribDate.getTime() - currentTime.getTime();
    if (diff <= 0) {
        // If today's sunset has already passed, calculate for tomorrow's sunset
        const tomorrowMaghrib = new Date(maghribDate.getTime() + 24 * 60 * 60 * 1000);
        diff = tomorrowMaghrib.getTime() - currentTime.getTime();
    }

    return diff;
};
