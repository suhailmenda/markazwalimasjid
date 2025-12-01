import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const PrayerContext = createContext();

export const usePrayerTimes = () => useContext(PrayerContext);

export const PrayerProvider = ({ children }) => {
    const [prayerTimes, setPrayerTimes] = useState(null);
    const [loading, setLoading] = useState(true);
    const [manualTimes, setManualTimes] = useState(() => {
        const saved = localStorage.getItem('manualPrayerTimes');
        return saved ? JSON.parse(saved) : {
            Fajr: { adhan: '', jamat: '06:00' },
            Dhuhr: { adhan: '', jamat: '13:30' },
            Asr: { adhan: '', jamat: '17:00' },
            Maghrib: { adhan: '', jamat: 'Sunset' },
            Isha: { adhan: '', jamat: '21:00' },
            Jummah: { adhan: '13:00', jamat: '13:30' }
        };
    });

    useEffect(() => {
        const fetchPrayerTimes = async () => {
            try {
                const date = new Date();
                const response = await axios.get('https://api.aladhan.com/v1/timingsByCity', {
                    params: {
                        city: 'Silvassa',
                        country: 'India',
                        method: 2, // ISNA
                        date: date.getDate() + '-' + (date.getMonth() + 1) + '-' + date.getFullYear()
                    }
                });
                setPrayerTimes(response.data.data.timings);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching prayer times:', error);
                setLoading(false);
            }
        };

        fetchPrayerTimes();
    }, []);

    const updateManualTime = (prayer, type, value) => {
        const newTimes = {
            ...manualTimes,
            [prayer]: {
                ...manualTimes[prayer],
                [type]: value
            }
        };
        setManualTimes(newTimes);
        localStorage.setItem('manualPrayerTimes', JSON.stringify(newTimes));
    };

    return (
        <PrayerContext.Provider value={{ prayerTimes, manualTimes, loading, updateManualTime }}>
            {children}
        </PrayerContext.Provider>
    );
};
