import React, { useState, useEffect } from 'react';
import { Clock, MapPin } from 'lucide-react';
import type { AladhanTimings, ManualTimes, PrayerName } from '../types/prayer';
import { getIslamicDateAtSunset } from '../utils/sunsetScheduler';
import './PrayerTimes.css';

const DEFAULT_TIMES: ManualTimes = {
    Fajr: { adhan: '05:15', jamat: '05:45' },
    Dhuhr: { adhan: '12:45', jamat: '13:30' },
    Asr: { adhan: '16:45', jamat: '17:15' },
    Maghrib: { adhan: '19:05', jamat: '19:15' },
    Isha: { adhan: '20:30', jamat: '21:00' },
    Jummah: { adhan: '13:00', jamat: '13:30' },
    Ishraq: { adhan: '-', jamat: '06:45' },
    Chast: { adhan: '-', jamat: '10:00' },
};

interface PrayerTimesProps {
    prayerTimes: AladhanTimings | null;
    manualTimes: ManualTimes;
    loading: boolean;
    manualIslamicDate: string;
    apiIslamicDate?: string;
}

const PrayerTimes: React.FC<PrayerTimesProps> = ({
    prayerTimes,
    manualTimes,
    loading,
    manualIslamicDate,
    apiIslamicDate = '',
}) => {
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const prayers: Array<{ name: string; key: PrayerName }> = [
        { name: 'Fajr', key: 'Fajr' },
        { name: 'Dhuhr', key: 'Dhuhr' },
        { name: 'Asr', key: 'Asr' },
        { name: 'Maghrib', key: 'Maghrib' },
        { name: 'Isha', key: 'Isha' },
        { name: 'Jummah', key: 'Jummah' },
        // { name: 'Ishraq', key: 'Ishraq' },
        // { name: 'Chast', key: 'Chast' },
    ];

    const formatTime = (timeString: string | undefined): string => {
        if (!timeString || typeof timeString !== 'string') return '';
        if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
        return timeString.split(' ')[0];
    };

    const safeManual = manualTimes || DEFAULT_TIMES;
    const maghribAdhanStr = safeManual.Maghrib?.adhan || prayerTimes?.Maghrib;

    // Helper to get Islamic Date (Hijri) with auto sunset (+1 day) transition
    const calculatedIslamicDate = apiIslamicDate || getIslamicDateAtSunset(currentTime, maghribAdhanStr);

    return (
        <section id="prayer-times" className="section-padding prayer-section">
            <div className="container">
                <div className="section-header text-center">
                    <h2 className="section-title">Prayer Times</h2>
                    <div className="location-badge">
                        <MapPin size={16} />
                        <span>Silvassa, India</span>
                    </div>
                </div>

                <div className="prayer-card">
                    <div className="current-time-display">
                        <Clock className="mb-2 text-gold" size={32} />
                        <div className="time">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </div>
                        <div className="date">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </div>
                        <div className="islamic-date-container">
                            <span className="islamic-date-display">{manualIslamicDate || calculatedIslamicDate}</span>
                        </div>
                    </div>

                    <div className="prayer-table-container">
                        <table className="prayer-table">
                            <thead>
                                <tr>
                                    <th>Prayer</th>
                                    <th>Adhan</th>
                                    <th>Jamat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={3} className="text-center p-4">Loading prayer times...</td></tr>
                                ) : (
                                    prayers.map((prayer) => {
                                        const apiTime = prayerTimes && prayerTimes[prayer.key] ? formatTime(prayerTimes[prayer.key]) : '';
                                        const defaultAdhan = DEFAULT_TIMES[prayer.key]?.adhan || apiTime || '-';
                                        const defaultJamat = DEFAULT_TIMES[prayer.key]?.jamat || '-';

                                        const adhanTime = safeManual[prayer.key]?.adhan || defaultAdhan;
                                        const jamatTime = safeManual[prayer.key]?.jamat || defaultJamat;

                                        return (
                                            <tr key={prayer.key} className="prayer-row">
                                                <td className="prayer-name">{prayer.name}</td>
                                                <td className="prayer-time">
                                                    <div className="cell-content">{adhanTime}</div>
                                                </td>
                                                <td className="prayer-time font-bold text-primary">
                                                    <div className="cell-content font-bold text-primary">{jamatTime}</div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PrayerTimes;
