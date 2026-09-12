import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from './firebase';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import type { ManualTimes, UsePrayerTimesReturn } from './types/prayer';
import { getTodayPrayerStartEndMap } from './utils/prayerStartEnd';
import { parseIslamicDateString, type IslamicDateCache } from './utils/islamicDate';
import { sendFcmBulkNotification } from './utils/sendFcmNotification';

export const usePrayerTimes = (): UsePrayerTimesReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [manualTimes, setManualTimes] = useState<ManualTimes>({});
  const [islamicDate, setIslamicDate] = useState<string>('');

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
                  ...data.manualTimes,
                  Maghrib: {
                    adhan: jsonMaghribTime,
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
      ...newManualTimes,
      Maghrib: {
        adhan: jsonMaghribTime,
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
        const { day, month, year } = parseIslamicDateString(val);
        await setDoc(
          doc(db, 'settings', 'islamicDateCache'),
          { date: `${dd}-${mm}-${yyyy}`, time: jsonMaghribTime, day, month, year, islamicDate: val },
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

  return {
    manualTimes,
    islamicDate,
    loading,
    saveAllSettings,
  };
};
