import { useState, useEffect } from 'react';
import axios from 'axios';
import { db, isFirebaseConfigured } from './firebase';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import type {
  AladhanTimings,
  ManualTimes,
  PrayerName,
  SaveStatus,
  TimeType,
  UsePrayerTimesReturn,
} from './types/prayer';

const DEFAULT_MANUAL_TIMES: ManualTimes = {
  Fajr: { adhan: '05:15', jamat: '05:45' },
  Dhuhr: { adhan: '12:45', jamat: '13:30' },
  Asr: { adhan: '16:45', jamat: '17:15' },
  Maghrib: { adhan: '19:05', jamat: '19:15' },
  Isha: { adhan: '20:30', jamat: '21:00' },
  Jummah: { adhan: '13:00', jamat: '13:30' },
};

export const usePrayerTimes = (): UsePrayerTimesReturn => {
  const [prayerTimes, setPrayerTimes] = useState<AladhanTimings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    isFirebaseConfigured ? 'saved' : 'local',
  );

  // Manual prayer times (Adhan & Jamat)
  const [manualTimes, setManualTimes] = useState<ManualTimes>(() => {
    const saved = localStorage.getItem('manualPrayerTimes');
    return saved ? (JSON.parse(saved) as ManualTimes) : DEFAULT_MANUAL_TIMES;
  });

  // Manual Islamic date override
  const [manualIslamicDate, setManualIslamicDate] = useState<string>(() => {
    return localStorage.getItem('manualIslamicDate') ?? '';
  });

  // Fetch API prayer times & listen to Firestore real-time updates
  useEffect(() => {
    const fetchApiTimes = async (): Promise<void> => {
      try {
        const date = new Date();
        const response = await axios.get<{ data: { timings: AladhanTimings } }>(
          'https://api.aladhan.com/v1/timingsByCity',
          {
            params: {
              city: 'Silvassa',
              country: 'India',
              method: 2,
              date: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`,
            },
          },
        );
        setPrayerTimes(response.data.data.timings);
      } catch (error) {
        console.error('Error fetching Aladhan prayer times API:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchApiTimes();

    // Subscribe to Firestore for real-time live visitor updates
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
                setManualTimes(data.manualTimes);
                localStorage.setItem('manualPrayerTimes', JSON.stringify(data.manualTimes));
              }
              if (data.manualIslamicDate !== undefined) {
                setManualIslamicDate(data.manualIslamicDate ?? '');
                if (data.manualIslamicDate) {
                  localStorage.setItem('manualIslamicDate', data.manualIslamicDate);
                } else {
                  localStorage.removeItem('manualIslamicDate');
                }
              }
              setSaveStatus('saved');
            }
          },
          (error) => {
            console.error('Firestore listener error:', error);
          },
        );
      } catch (err) {
        console.error('Error attaching Firestore listener:', err);
      }
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Update Adhan or Jamat time for a specific prayer
  const updateManualTime = async (
    prayer: PrayerName,
    type: TimeType,
    value: string,
  ): Promise<void> => {
    const updated: ManualTimes = {
      ...manualTimes,
      [prayer]: {
        ...manualTimes[prayer],
        [type]: value,
      },
    };
    setManualTimes(updated);
    localStorage.setItem('manualPrayerTimes', JSON.stringify(updated));

    if (isFirebaseConfigured && db) {
      try {
        setSaveStatus('saving');
        await setDoc(doc(db, 'settings', 'prayerTimes'), { manualTimes: updated }, { merge: true });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving prayer times to Firestore:', err);
        setSaveStatus('error');
      }
    }
  };

  // Save all manual prayer times and Islamic date together (Manual Save)
  const saveAllSettings = async (
    newManualTimes: ManualTimes,
    newIslamicDate: string,
  ): Promise<void> => {
    const val = newIslamicDate ? newIslamicDate.trim() : '';
    setManualTimes(newManualTimes);
    setManualIslamicDate(val);

    localStorage.setItem('manualPrayerTimes', JSON.stringify(newManualTimes));
    if (val) {
      localStorage.setItem('manualIslamicDate', val);
    } else {
      localStorage.removeItem('manualIslamicDate');
    }

    if (isFirebaseConfigured && db) {
      try {
        setSaveStatus('saving');
        await setDoc(
          doc(db, 'settings', 'prayerTimes'),
          { manualTimes: newManualTimes, manualIslamicDate: val },
          { merge: true },
        );
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving settings to Firestore:', err);
        setSaveStatus('error');
      }
    }
  };

  return {
    prayerTimes,
    manualTimes,
    loading,
    updateManualTime,
    manualIslamicDate,
    saveAllSettings,
    saveStatus,
    isFirebaseConfigured,
  };
};
