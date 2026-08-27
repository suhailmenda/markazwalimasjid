import React, { useState, useEffect } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { DEFAULT_TIMES, type ManualTimes, type PrayerName } from '../types/prayer';
import { getIslamicDateAtSunset } from '../utils/sunsetScheduler';
import { getTodayPrayerStartEndMap } from '../utils/prayerStartEnd';
import { formatTo12HourDisplay } from '../utils/timeFormat';
import './PrayerTimes.css';

interface PrayerTimesProps {
    manualTimes: ManualTimes;
    loading: boolean;
    manualIslamicDate: string;
}

const PrayerTimes: React.FC<PrayerTimesProps> = ({
    manualTimes,
    loading,
    manualIslamicDate,
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
    const calculatedIslamicDate = getIslamicDateAtSunset(currentTime, maghribAdhanStr);

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
                    {/* Header Card Display */}
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

                    {/* Desktop View: Full 5-Column Table */}
                    <div className="prayer-table-container desktop-only-view">
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

                                                {/* Start Column */}
                                                <td className="prayer-time">
                                                    <div className="cell-content">{startEnd.start}</div>
                                                </td>

                                                {/* Azaan Column */}
                                                <td className="prayer-time">
                                                    <div className="cell-content">{adhanTime}</div>
                                                </td>

                                                {/* Jamaat Column */}
                                                <td className="prayer-time font-bold text-primary">
                                                    <div className="cell-content font-bold text-primary">{jamatTime}</div>
                                                </td>

                                                {/* End Column */}
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

                    {/* Mobile View: Sleek Stacked Prayer Cards */}
                    <div className="prayer-mobile-list mobile-only-view">
                        {loading ? (
                            <div className="text-center p-4 text-gray-500">Loading prayer times...</div>
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
                                    <div key={prayer.key} className="prayer-mobile-card">
                                        <div className="prayer-mobile-card-top">
                                            <span className="prayer-mobile-name">{prayer.name}</span>
                                            {isNafl && <span className="nafl-badge">Nafl</span>}
                                        </div>

                                        {isNafl ? (
                                            /* For Nafl Prayers (Ishraq & Chasht): Show Start and End as main time chips */
                                            <div className="prayer-mobile-main-times">
                                                <div className="mobile-time-chip">
                                                    <span className="chip-label">Start</span>
                                                    <div className="chip-value-container">
                                                        <span className="chip-value">{startEnd.start}</span>
                                                    </div>
                                                </div>

                                                <div className="mobile-time-chip">
                                                    <span className="chip-label">End</span>
                                                    <div className="chip-value-container">
                                                        <span className="chip-value">{startEnd.end}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* For Obligatory Prayers: Show Azaan & Jamaat as main time chips */
                                            <>
                                                <div className="prayer-mobile-main-times">
                                                    <div className="mobile-time-chip">
                                                        <span className="chip-label">Azaan</span>
                                                        <div className="chip-value-container">
                                                            <span className="chip-value">{adhanTime}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mobile-time-chip jamat-chip">
                                                        <span className="chip-label">Jamaat</span>
                                                        <div className="chip-value-container">
                                                            <span className="chip-value">{jamatTime}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="prayer-mobile-sub-times">
                                                    <span>Start: <strong>{startEnd.start}</strong></span>
                                                    <span>End: <strong>{startEnd.end}</strong></span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>
        </section>
    );
};

export default PrayerTimes;
