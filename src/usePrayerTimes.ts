import { useState, useEffect } from 'react';
import { db, isFirebaseConfigured } from './firebase';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { DEFAULT_TIMES, type ManualTimes, type UsePrayerTimesReturn } from './types/prayer';
import { getTodayPrayerStartEndMap } from './utils/prayerStartEnd';

export const usePrayerTimes = (): UsePrayerTimesReturn => {
  const [loading, setLoading] = useState<boolean>(true);
  const [manualTimes, setManualTimes] = useState<ManualTimes>(DEFAULT_TIMES);
  const [manualIslamicDate, setManualIslamicDate] = useState<string>('');

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'settings', 'prayerTimes');
        unsubscribe = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as {
                manualTimes?: ManualTimes;
                manualIslamicDate?: string;
              };
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
              if (data.manualIslamicDate !== undefined) {
                setManualIslamicDate(data.manualIslamicDate ?? '');
              }
            }
            setLoading(false);
          },
          (error) => {
            console.error('Firestore listener error:', error);
            setLoading(false);
          },
        );
      } catch (err) {
        console.error('Error attaching Firestore listener:', err);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
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

    setManualTimes(sanitizedTimes);
    setManualIslamicDate(val);

    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'settings', 'prayerTimes'),
        { manualTimes: sanitizedTimes, manualIslamicDate: val },
        { merge: true },
      );
    }
  };

  return {
    manualTimes,
    manualIslamicDate,
    loading,
    saveAllSettings,
  };
};
