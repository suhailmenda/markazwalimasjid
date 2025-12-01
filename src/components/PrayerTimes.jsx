import React, { useState, useEffect } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { usePrayerTimes } from '../context/PrayerContext';
import './PrayerTimes.css';

const PrayerTimes = () => {
    const { prayerTimes, manualTimes, loading, manualIslamicDate } = usePrayerTimes();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const prayers = [
        { name: 'Fajr', key: 'Fajr' },
        { name: 'Dhuhr', key: 'Dhuhr' },
        { name: 'Asr', key: 'Asr' },
        { name: 'Maghrib', key: 'Maghrib' },
        { name: 'Isha', key: 'Isha' },
        { name: 'Jummah', key: 'Jummah' },
    ];

    const formatTime = (timeString) => {
        if (!timeString) return '-';
        // If it's already in HH:mm format, return it
        if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
        // If it comes from API (HH:mm (EST)), strip the timezone
        return timeString.split(' ')[0];
    };

    // Helper to get Islamic Date (Hijri)
    // Note: In a real app, we might want to use the date from the API response which includes Hijri date
    // But since we are using the API for times, we can also use it for date if available, 
    // or use Intl.DateTimeFormat for client-side approximation.
    const getIslamicDate = () => {
        return new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(currentTime);
    };

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
                        <div className="time">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="date">{currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div className="islamic-date-display">{manualIslamicDate || getIslamicDate()}</div>
                    </div>

                    <div className="prayer-table-container">
                        <table className="prayer-table">
                            <thead>
                                <tr>
                                    <th>Prayer</th>
                                    <th>Begins</th>
                                    <th>Adhan</th>
                                    <th>Jamat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" className="text-center p-4">Loading prayer times...</td></tr>
                                ) : (
                                    prayers.map((prayer) => {
                                        const apiTime = prayerTimes && prayerTimes[prayer.key] ? formatTime(prayerTimes[prayer.key]) : '-';
                                        const adhanTime = manualTimes[prayer.key]?.adhan || apiTime;
                                        const jamatTime = manualTimes[prayer.key]?.jamat || '-';

                                        // Special case for Jummah
                                        if (prayer.key === 'Jummah') {
                                            return (
                                                <tr key={prayer.key} className="prayer-row">
                                                    <td className="prayer-name">{prayer.name}</td>
                                                    <td className="prayer-time">-</td>
                                                    <td className="prayer-time">{adhanTime}</td>
                                                    <td className="prayer-time">{jamatTime}</td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={prayer.key} className="prayer-row">
                                                <td className="prayer-name">{prayer.name}</td>
                                                <td className="prayer-time text-muted">{apiTime}</td>
                                                <td className="prayer-time">{adhanTime}</td>
                                                <td className="prayer-time font-bold text-primary">{jamatTime}</td>
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
