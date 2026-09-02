import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getTodayPrayerStartEndMap } from './prayerStartEnd';
import { parseTimeToToday } from './timeFormat';

export interface IslamicDateCache {
  date: string;        // e.g. "28-08-2026"
  time: string;        // e.g. "07:04 pm"
  islamicDate: string; // e.g. "15 Rabīʿ al-awwal 1448 AH"
  expiresAt: string;   // ISO timestamp string e.g. "2026-08-28T13:32:00.000Z"
}

/**
 * Calculates the exact next Maghrib timestamp when the current Islamic day expires.
 * - Before Maghrib today  => Expires at today's Maghrib timestamp.
 * - Past Maghrib today    => Expires at tomorrow's Maghrib timestamp.
 */
export const getNextMaghribExpiration = (currentTime: Date = new Date()): Date => {
  const todayMap = getTodayPrayerStartEndMap(currentTime);
  const maghribStr = todayMap.map.Maghrib.start || '07:04 pm';
  const todayMaghrib = parseTimeToToday(maghribStr, currentTime);

  if (todayMaghrib && currentTime < todayMaghrib) {
    return todayMaghrib;
  } else {
    const tomorrow = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowMap = getTodayPrayerStartEndMap(tomorrow);
    const tomorrowMaghribStr = tomorrowMap.map.Maghrib.start || '07:04 pm';
    return parseTimeToToday(tomorrowMaghribStr, tomorrow) || new Date(tomorrow.setHours(19, 4, 0, 0));
  }
};

/**
 * Checks Firestore islamicDateCache using the expiresAt timestamp.
 * - If currentTime < expiresAt (Maghrib has NOT been crossed), returns cached Islamic date directly.
 * - If currentTime >= expiresAt (Maghrib crossed), fetches Aladhan API and updates cache.
 */
export const getOrFetchIslamicDateWithFirestore = async (
  currentTime: Date = new Date(),
  maghribTimeStr: string = '07:04 pm'
): Promise<string> => {
  // 1. Try reading from Firestore cache
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'settings', 'islamicDateCache');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<IslamicDateCache>;
        if (data.islamicDate && data.expiresAt) {
          const expiryTimestamp = new Date(data.expiresAt).getTime();
          if (currentTime.getTime() < expiryTimestamp) {
            // Current time is before next Maghrib expiration -> Return cached date directly
            return data.islamicDate;
          }
        }
      }
    } catch (err) {
      console.error('Error reading Islamic date cache from Firestore:', err);
    }
  }

  // 2. Expiration timestamp crossed or cache miss: Fetch from API and update cache
  return forceSyncIslamicDateWithAladhan(currentTime, maghribTimeStr);
};

/**
 * Directly calls Aladhan API (Silvassa, method=2) for the active date and updates Firestore settings/islamicDateCache.
 */
export const forceSyncIslamicDateWithAladhan = async (
  currentTime: Date = new Date(),
  maghribTimeStr: string = '07:04 pm'
): Promise<string> => {
  const dd = currentTime.getDate().toString().padStart(2, '0');
  const mm = (currentTime.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = currentTime.getFullYear();
  const dateKey = `${dd}-${mm}-${yyyy}`;

  const response = await fetch(
    `https://api.aladhan.com/v1/timingsByCity/${dateKey}?city=Silvassa&country=India&method=2`
  );

  if (!response.ok) {
    throw new Error(`Aladhan API HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json && json.data && json.data.date && json.data.date.hijri) {
    const h = json.data.date.hijri;
    const monthName = h.month.en || 'Rabi\' al-awwal';
    const fetchedIslamicDate = `${h.day} ${monthName} ${h.year} ${h.designation?.abbreviated || 'AH'}`;

    const nextMaghrib = getNextMaghribExpiration(currentTime);

    const cacheObj: IslamicDateCache = {
      date: dateKey,
      time: maghribTimeStr,
      islamicDate: fetchedIslamicDate,
      expiresAt: nextMaghrib.toISOString(),
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'settings', 'islamicDateCache'), cacheObj, { merge: true });
      } catch (err) {
        console.error('Error writing Islamic date cache to Firestore:', err);
      }
    }

    return fetchedIslamicDate;
  }

  throw new Error('Invalid Hijri data in Aladhan API response');
};
