import { db, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface IslamicDateCache {
  date: string;        // e.g. "27-08-2026"
  time: string;        // e.g. "07:04 pm"
  islamicDate: string; // e.g. "14 Rabīʿ al-awwal 1448 AH"
}

/**
 * Checks Firestore islamicDateCache for today's date key (DD-MM-YYYY).
 * If present in cache, returns it immediately.
 * Only calls Aladhan API if today's date key is NOT present in cache.
 */
export const getOrFetchIslamicDateWithFirestore = async (
  currentTime: Date = new Date(),
  maghribTimeStr: string = '07:04 pm'
): Promise<string> => {
  const dd = currentTime.getDate().toString().padStart(2, '0');
  const mm = (currentTime.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = currentTime.getFullYear();
  const targetDateKey = `${dd}-${mm}-${yyyy}`;

  // 1. Try reading from Firestore cache for today's targetDateKey
  if (isFirebaseConfigured && db) {
    try {
      const docRef = doc(db, 'settings', 'islamicDateCache');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as Partial<IslamicDateCache>;
        if (data.date === targetDateKey && data.islamicDate) {
          return data.islamicDate;
        }
      }
    } catch (err) {
      console.error('Error reading Islamic date cache from Firestore:', err);
    }
  }

  // 2. Fetch from Aladhan API if cache miss
  return forceSyncIslamicDateWithAladhan(currentTime, maghribTimeStr);
};

/**
 * Directly calls Aladhan API (Silvassa, method=2) for today's date and updates Firestore settings/islamicDateCache.
 */
export const forceSyncIslamicDateWithAladhan = async (
  currentTime: Date = new Date(),
  maghribTimeStr: string = '07:04 pm'
): Promise<string> => {
  const dd = currentTime.getDate().toString().padStart(2, '0');
  const mm = (currentTime.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = currentTime.getFullYear();
  const targetDateKey = `${dd}-${mm}-${yyyy}`;

  const response = await fetch(
    `https://api.aladhan.com/v1/timingsByCity/${targetDateKey}?city=Silvassa&country=India&method=2`
  );

  if (!response.ok) {
    throw new Error(`Aladhan API HTTP ${response.status}`);
  }

  const json = await response.json();
  if (json && json.data && json.data.date && json.data.date.hijri) {
    const h = json.data.date.hijri;
    const monthName = h.month.en || 'Rabi\' al-awwal';
    const fetchedIslamicDate = `${h.day} ${monthName} ${h.year} ${h.designation?.abbreviated || 'AH'}`;

    const cacheObj: IslamicDateCache = {
      date: targetDateKey,
      time: maghribTimeStr,
      islamicDate: fetchedIslamicDate,
    };

    // Save cache object directly to settings/islamicDateCache in Firestore
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
