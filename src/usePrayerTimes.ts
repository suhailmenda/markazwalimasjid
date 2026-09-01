import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from './firebase';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { DEFAULT_TIMES, type ManualTimes, type UsePrayerTimesReturn } from './types/prayer';
import { getTodayPrayerStartEndMap } from './utils/prayerStartEnd';
import {
  getOrFetchIslamicDateWithFirestore,
  forceSyncIslamicDateWithAladhan,
  type IslamicDateCache,
} from './utils/aladhanDate';
import { sendFcmBulkNotification } from './utils/sendFcmNotification';

export const usePrayerTimes = (): UsePrayerTimesReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [manualTimes, setManualTimes] = useState<ManualTimes>(DEFAULT_TIMES);
  const [islamicDate, setIslamicDate] = useState<string>('');

  // Fetch / check Islamic date with Firestore caching
  useEffect(() => {
    let isMounted = true;
    const checkIslamicDate = async () => {
      const todayJsonInfo = getTodayPrayerStartEndMap();
      const maghribTime = todayJsonInfo.map.Maghrib.start || '07:04 pm';
      const fetchedDate = await getOrFetchIslamicDateWithFirestore(new Date(), maghribTime);
      if (isMounted && fetchedDate) {
        setIslamicDate(fetchedDate);
      }
    };

    checkIslamicDate();
  }, []);

  // Firestore Realtime Listeners
  useEffect(() => {
    let unsubscribePrayer: Unsubscribe | null = null;
    let unsubscribeCache: Unsubscribe | null = null;

    if (isFirebaseConfigured && db) {
      try {
        // Listener for manual prayer times
        const docRef = doc(db, 'settings', 'prayerTimes');
        unsubscribePrayer = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as { manualTimes?: ManualTimes };
              if (data.manualTimes) {
                const todayJsonInfo = getTodayPrayerStartEndMap();
                const jsonMaghribTime = todayJsonInfo.map.Maghrib.start;

                const merged: ManualTimes = {
                  ...DEFAULT_TIMES,
                  ...data.manualTimes,
                  Maghrib: {
                    adhan: jsonMaghribTime || data.manualTimes.Maghrib?.adhan || '07:04 pm',
                    jamat: 'After Azaan',
                  },
                  Ishraq: { adhan: '-', jamat: '-' },
                  Chast: { adhan: '-', jamat: '-' },
                };
                setManualTimes(merged);
              }
            }
            setLoading(false);
          },
          (error) => {
            console.error('Firestore prayerTimes listener error:', error);
            setLoading(false);
          },
        );

        // Listener for cached Islamic date JSON { date, time, islamicDate }
        const cacheRef = doc(db, 'settings', 'islamicDateCache');
        unsubscribeCache = onSnapshot(
          cacheRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as Partial<IslamicDateCache>;
              if (data.islamicDate) {
                setIslamicDate(data.islamicDate);
              }
            }
          },
          (error) => {
            console.error('Firestore islamicDateCache listener error:', error);
          },
        );
      } catch (err) {
        console.error('Error attaching Firestore listeners:', err);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribePrayer) unsubscribePrayer();
      if (unsubscribeCache) unsubscribeCache();
    };
  }, []);

  const saveAllSettings = async (
    newManualTimes: ManualTimes,
    newIslamicDate: string,
  ): Promise<void> => {
    const val = newIslamicDate ? newIslamicDate.trim() : '';

    const todayJsonInfo = getTodayPrayerStartEndMap();
    const jsonMaghribTime = todayJsonInfo.map.Maghrib.start;

    const sanitizedTimes: ManualTimes = {
      ...DEFAULT_TIMES,
      ...newManualTimes,
      Maghrib: {
        adhan: jsonMaghribTime || newManualTimes.Maghrib?.adhan || '07:04 pm',
        jamat: 'After Azaan',
      },
      Ishraq: { adhan: '-', jamat: '-' },
      Chast: { adhan: '-', jamat: '-' },
    };

    const timesHaveChanged = JSON.stringify(manualTimes) !== JSON.stringify(sanitizedTimes);

    setManualTimes(sanitizedTimes);
    if (val) setIslamicDate(val);

    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'settings', 'prayerTimes'),
        { manualTimes: sanitizedTimes },
        { merge: true },
      );
      if (val) {
        const dd = new Date().getDate().toString().padStart(2, '0');
        const mm = (new Date().getMonth() + 1).toString().padStart(2, '0');
        const yyyy = new Date().getFullYear();
        await setDoc(
          doc(db, 'settings', 'islamicDateCache'),
          { date: `${dd}-${mm}-${yyyy}`, time: '07:04 pm', islamicDate: val },
          { merge: true },
        );
      }

      // Send FCM bulk push notification ONLY if prayer times changed
      if (timesHaveChanged) {
        try {
          await sendFcmBulkNotification();
        } catch (err) {
          console.error('Failed to trigger FCM bulk push notification:', err);
        }
      }
    }
  };

  /**
   * Directly calls Aladhan API and updates Firestore settings/islamicDateCache.
   */
  const syncIslamicDate = async (): Promise<string> => {
    const todayJsonInfo = getTodayPrayerStartEndMap();
    const maghribTime = todayJsonInfo.map.Maghrib.start || '07:04 pm';
    const syncedDate = await forceSyncIslamicDateWithAladhan(new Date(), maghribTime);
    if (syncedDate) {
      setIslamicDate(syncedDate);
    }
    return syncedDate;
  };

  return {
    manualTimes,
    islamicDate,
    loading,
    saveAllSettings,
    syncIslamicDate,
  };
};
