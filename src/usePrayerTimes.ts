import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { db, isFirebaseConfigured } from './firebase';
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import type {
  AladhanTimings,
  AladhanDate,
  AladhanApiResponse,
  ManualTimes,
  PrayerName,
  SaveStatus,
  TimeType,
  UsePrayerTimesReturn,
} from './types/prayer';
import { getMsUntilNextSunset } from './utils/sunsetScheduler';

const formatTime = (timeString: string | undefined): string => {
  if (!timeString || typeof timeString !== 'string') return '';
  if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
  return timeString.split(' ')[0];
};

const DEFAULT_MANUAL_TIMES: ManualTimes = {
  Fajr: { adhan: '05:15', jamat: '05:45' },
  Dhuhr: { adhan: '12:45', jamat: '13:30' },
  Asr: { adhan: '16:45', jamat: '17:15' },
  Maghrib: { adhan: '19:05', jamat: 'After Azaan' },
  Isha: { adhan: '20:30', jamat: '21:00' },
  Jummah: { adhan: '13:00', jamat: '13:30' },
  Ishraq: { adhan: '-', jamat: '06:45' },
  Chast: { adhan: '-', jamat: '10:00' },
};

export const usePrayerTimes = (): UsePrayerTimesReturn => {
  const [prayerTimes, setPrayerTimes] = useState<AladhanTimings | null>(null);
  const [apiDate, setApiDate] = useState<AladhanDate | null>(null);
  const [apiIslamicDate, setApiIslamicDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    isFirebaseConfigured ? 'saved' : 'local',
  );

  // Manual prayer times (Adhan & Jamat) - state sourced exclusively from Firestore / defaults
  const [manualTimes, setManualTimes] = useState<ManualTimes>(DEFAULT_MANUAL_TIMES);

  // Manual Islamic date override - state sourced exclusively from Firestore / defaults
  const [manualIslamicDate, setManualIslamicDate] = useState<string>('');

  // Fetch API prayer times & date for Silvassa, India
  const fetchApiTimes = useCallback(async (): Promise<{ timings: AladhanTimings; date: AladhanDate } | null> => {
    try {
      const date = new Date();
      const response = await axios.get<AladhanApiResponse>(
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
      const { timings, date: apiDateObj } = response.data.data;
      setPrayerTimes(timings);
      setApiDate(apiDateObj);

      if (apiDateObj?.hijri) {
        const formattedHijri = `${apiDateObj.hijri.month.en} ${apiDateObj.hijri.day}, ${apiDateObj.hijri.year} ${apiDateObj.hijri.designation?.abbreviated || 'AH'}`;
        setApiIslamicDate(formattedHijri);
      }

      return { timings, date: apiDateObj };
    } catch (error) {
      console.error('Error fetching Aladhan prayer times API:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync API timings & date now, then persist to Firestore
  const syncApiTimesNow = useCallback(async (): Promise<void> => {
    setSaveStatus('saving');
    const res = await fetchApiTimes();
    if (res?.timings) {
      const apiMaghribAdhan = formatTime(res.timings.Maghrib);
      const updatedTimes: ManualTimes = {
        ...DEFAULT_MANUAL_TIMES,
        ...manualTimes,
        Maghrib: {
          adhan: apiMaghribAdhan || manualTimes.Maghrib?.adhan || '19:05',
          jamat: 'After Azaan',
        },
      };

      let syncedIslamicDate = manualIslamicDate;
      if (res.date?.hijri) {
        syncedIslamicDate = `${res.date.hijri.month.en} ${res.date.hijri.day}, ${res.date.hijri.year} ${res.date.hijri.designation?.abbreviated || 'AH'}`;
      }

      setManualTimes(updatedTimes);
      if (syncedIslamicDate) {
        setManualIslamicDate(syncedIslamicDate);
      }

      if (isFirebaseConfigured && db) {
        try {
          await setDoc(
            doc(db, 'settings', 'prayerTimes'),
            {
              manualTimes: updatedTimes,
              manualIslamicDate: syncedIslamicDate,
            },
            { merge: true },
          );
        } catch (err) {
          console.error('Error syncing API times & date to Firestore:', err);
        }
      }
    }
    setSaveStatus('saved');
  }, [fetchApiTimes, manualTimes, manualIslamicDate]);

  // Fetch API prayer times & listen to Firestore real-time updates
  useEffect(() => {
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
                // Ensure Maghrib is always exact API sunset / After Azaan and defaults exist
                const merged: ManualTimes = {
                  ...DEFAULT_MANUAL_TIMES,
                  ...data.manualTimes,
                  Maghrib: {
                    adhan: data.manualTimes.Maghrib?.adhan || '19:05',
                    jamat: 'After Azaan',
                  },
                };
                setManualTimes(merged);
              }
              if (data.manualIslamicDate !== undefined) {
                setManualIslamicDate(data.manualIslamicDate ?? '');
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
  }, [fetchApiTimes]);

  // Sunset (Maghrib) Scheduler Effect
  // Triggers at sunset: fetches latest Silvassa timings and updates Firestore
  useEffect(() => {
    const maghribTime = prayerTimes?.Maghrib || manualTimes.Maghrib?.adhan;
    const msUntilSunset = getMsUntilNextSunset(maghribTime);

    if (msUntilSunset !== null && msUntilSunset > 0) {
      const timer = setTimeout(() => {
        console.log('Sunset reached (Maghrib)! Auto-syncing API timings & date to Firestore.');
        void syncApiTimesNow();
      }, msUntilSunset);

      return () => clearTimeout(timer);
    }
  }, [prayerTimes, manualTimes, syncApiTimesNow]);

  // Update Adhan or Jamat time for a specific prayer
  const updateManualTime = async (
    prayer: PrayerName,
    type: TimeType,
    value: string,
  ): Promise<void> => {
    // If prayer is Maghrib, keep Jamat as 'After Azaan'
    const finalValue = prayer === 'Maghrib' && type === 'jamat' ? 'After Azaan' : value;

    const updated: ManualTimes = {
      ...manualTimes,
      [prayer]: {
        ...manualTimes[prayer],
        [type]: finalValue,
      },
    };
    setManualTimes(updated);

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

    // Enforce Maghrib rules: exact Adhan from API or current, Jamat = 'After Azaan'
    const maghribAdhan = prayerTimes?.Maghrib ? formatTime(prayerTimes.Maghrib) : newManualTimes.Maghrib?.adhan || '19:05';
    const sanitizedTimes: ManualTimes = {
      ...DEFAULT_MANUAL_TIMES,
      ...newManualTimes,
      Maghrib: {
        adhan: maghribAdhan,
        jamat: 'After Azaan',
      },
    };

    setManualTimes(sanitizedTimes);
    setManualIslamicDate(val);

    if (isFirebaseConfigured && db) {
      try {
        setSaveStatus('saving');
        await setDoc(
          doc(db, 'settings', 'prayerTimes'),
          { manualTimes: sanitizedTimes, manualIslamicDate: val },
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
    apiDate,
    apiIslamicDate,
    manualTimes,
    loading,
    updateManualTime,
    manualIslamicDate,
    saveAllSettings,
    syncApiTimesNow,
    saveStatus,
    isFirebaseConfigured,
  };
};
