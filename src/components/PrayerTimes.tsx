import React, { useState, useEffect } from 'react';
import { Clock, MapPin } from 'lucide-react';
import type { AladhanTimings, ManualTimes, PrayerName } from '../types/prayer';
import { getIslamicDateAtSunset } from '../utils/sunsetScheduler';
import { getTodayPrayerStartEndMap } from '../utils/prayerStartEnd';
import { formatTo12HourDisplay } from '../utils/timeFormat';
import './PrayerTimes.css';

const DEFAULT_TIMES: ManualTimes = {
    Fajr: { adhan: '05:15 am', jamat: '05:45 am' },
    Ishraq: { adhan: '-', jamat: '-' },
    Chast: { adhan: '-', jamat: '-' },
    Dhuhr: { adhan: '12:45 pm', jamat: '01:30 pm' },
    Asr: { adhan: '04:45 pm', jamat: '05:15 pm' },
    Maghrib: { adhan: '07:04 pm', jamat: 'After Azaan' },
    Isha: { adhan: '08:30 pm', jamat: '09:00 pm' },
    Jummah: { adhan: '01:00 pm', jamat: '01:30 pm' },
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
        { name: 'Ishraq', key: 'Ishraq' },
        { name: 'Chasht', key: 'Chast' },
        { name: 'Dhuhr', key: 'Dhuhr' },
        { name: 'Asr', key: 'Asr' },
        { name: 'Maghrib', key: 'Maghrib' },
        { name: 'Isha', key: 'Isha' },
        { name: 'Jummah', key: 'Jummah' },
    ];

    const safeManual = manualTimes || DEFAULT_TIMES;
    const { map: todayStartEndMap } = getTodayPrayerStartEndMap(currentTime);
    const maghribAdhanStr = todayStartEndMap.Maghrib.start || safeManual.Maghrib?.adhan || '7:04 pm';

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
                                    <th>Start</th>
                                    <th>Azaan</th>
                                    <th>Jamaat</th>
                                    <th>End</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center p-4">Loading prayer times...</td></tr>
                                ) : (
                                    prayers.map((prayer) => {
                                        const isNafl = prayer.key === 'Ishraq' || prayer.key === 'Chast';
                                        const startEnd = todayStartEndMap[prayer.key] || { start: '-', end: '-' };

                                        const defaultAdhan = isNafl
                                            ? '-'
                                            : prayer.key === 'Maghrib'
                                                ? startEnd.start
                                                : (DEFAULT_TIMES[prayer.key]?.adhan || '-');

                                        const defaultJamat = isNafl
                                            ? '-'
                                            : prayer.key === 'Maghrib'
                                                ? 'After Azaan'
                                                : (DEFAULT_TIMES[prayer.key]?.jamat || '-');

                                        const adhanTime = isNafl
                                            ? '-'
                                            : prayer.key === 'Maghrib'
                                                ? startEnd.start
                                                : formatTo12HourDisplay(safeManual[prayer.key]?.adhan || defaultAdhan);

                                        const jamatTime = isNafl
                                            ? '-'
                                            : prayer.key === 'Maghrib'
                                                ? 'After Azaan'
                                                : formatTo12HourDisplay(safeManual[prayer.key]?.jamat || defaultJamat);

                                        return (
                                            <tr key={prayer.key} className="prayer-row">
                                                <td className="prayer-name">{prayer.name}</td>

                                                {/* Start Time Column */}
                                                <td className="prayer-time">
                                                    <div className="cell-content">{startEnd.start}</div>
                                                </td>

                                                {/* Adhan Column */}
                                                <td className="prayer-time">
                                                    <div className="cell-content">{adhanTime}</div>
                                                </td>

                                                {/* Jamat Column */}
                                                <td className="prayer-time font-bold text-primary">
                                                    <div className="cell-content font-bold text-primary">{jamatTime}</div>
                                                </td>

                                                {/* End Time Column (Moved to Last) */}
                                                <td className="prayer-time">
                                                    <div className="cell-content">{startEnd.end}</div>
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
