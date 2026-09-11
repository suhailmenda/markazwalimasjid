import React, { useState, useEffect } from 'react';
import { Pencil, Save, X, ArrowLeft, LogIn, Lock, Mail, ShieldAlert, RefreshCw, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, type User } from 'firebase/auth';
import { type ManualTimes, type PrayerName, type TimeType } from '../types/prayer';
import { getTodayPrayerStartEndMap } from '../utils/prayerStartEnd';
import { HIJRI_MONTHS, parseIslamicDateString } from '../utils/islamicDate';
import CurrentNextPrayer from './CurrentNextPrayer';
import './Admin.css';
import './PrayerTimes.css';

export interface TimeParts {
    time: string;
    period: 'AM' | 'PM';
}


export const splitTimeAndPeriod = (stored = '', defaultPeriod: 'AM' | 'PM' = 'AM'): TimeParts => {
    if (!stored || stored === 'After Azaan' || stored === '-') {
        return { time: stored, period: defaultPeriod };
    }
    const isPM = stored.toLowerCase().includes('pm');
    const isAM = stored.toLowerCase().includes('am');
    const period: 'AM' | 'PM' = isPM ? 'PM' : isAM ? 'AM' : defaultPeriod;
    const time = stored.replace(/[^0-9:]/g, '').trim().replace(/^(\d):/, '0$1:');
    return { time, period };
};

export const joinTimeAndPeriod = (time: string, period: 'AM' | 'PM'): string => {
    if (!time || time === 'After Azaan' || time === '-') return time;
    const clean = time.trim();
    const parts = clean.split(':');
    const padded = parts.length === 2 && parts[0].length === 1 ? `0${parts[0]}:${parts[1]}` : clean;
    return `${padded} ${period.toLowerCase()}`;
};

interface AdminProps {
    manualTimes?: ManualTimes;
    saveAllSettings?: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
    islamicDate?: string;
}

const Admin: React.FC<AdminProps> = ({
    manualTimes,
    saveAllSettings,
    islamicDate = '',
}) => {
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const safeManual = manualTimes || {};
    const { map: todayStartEndMap } = getTodayPrayerStartEndMap(currentTime);

    // Edit Mode State (Desktop global edit mode)
    const [isEditing, setIsEditing] = useState<boolean>(false);
    // Per-Card Edit Mode State (Mobile view)
    const [editingCard, setEditingCard] = useState<PrayerName | null>(null);
    // Mobile Islamic Date Edit State
    const [isEditingDate, setIsEditingDate] = useState<boolean>(false);

    const [draftTimes, setDraftTimes] = useState<ManualTimes>(() => safeManual);
    const [draftIslamicDate, setDraftIslamicDate] = useState<string>(islamicDate);

    const initialParsedDate = parseIslamicDateString(islamicDate);
    const [draftIslamicDay, setDraftIslamicDay] = useState<number>(initialParsedDate.day);
    const [draftIslamicMonth, setDraftIslamicMonth] = useState<string>(initialParsedDate.month);
    const [draftIslamicYear, setDraftIslamicYear] = useState<number>(initialParsedDate.year);

    const [isSaving, setIsSaving] = useState<boolean>(false);

    const syncDateDropdowns = (dateStr: string) => {
        const parsed = parseIslamicDateString(dateStr);
        setDraftIslamicDay(parsed.day);
        setDraftIslamicMonth(parsed.month);
        setDraftIslamicYear(parsed.year);
        setDraftIslamicDate(dateStr);
    };

    const handleIslamicDayChange = (day: number) => {
        setDraftIslamicDay(day);
        setDraftIslamicDate(`${day} ${draftIslamicMonth} ${draftIslamicYear} AH`);
    };

    const handleIslamicMonthChange = (month: string) => {
        setDraftIslamicMonth(month);
        setDraftIslamicDate(`${draftIslamicDay} ${month} ${draftIslamicYear} AH`);
    };

    const handleIslamicYearChange = (year: number) => {
        setDraftIslamicYear(year);
        setDraftIslamicDate(`${draftIslamicDay} ${draftIslamicMonth} ${year} AH`);
    };

    // Sync draftTimes when manualTimes updates and not currently editing
    useEffect(() => {
        if (!isEditing && !editingCard && !isEditingDate) {
            setDraftTimes(safeManual);
            syncDateDropdowns(islamicDate);
        }
    }, [manualTimes, islamicDate, isEditing, editingCard, isEditingDate, safeManual]);

    // Auth state
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState<boolean>(isFirebaseConfigured);
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loginError, setLoginError] = useState<string>('');
    const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

    useEffect(() => {
        if (!isFirebaseConfigured || !auth) {
            setAuthLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Enter Global Edit Mode & snapshot draft state
    const handleStartEdit = (): void => {
        setDraftTimes(JSON.parse(JSON.stringify(safeManual)) as ManualTimes);
        syncDateDropdowns(islamicDate);
        setIsEditing(true);
        setEditingCard(null);
        setIsEditingDate(false);
    };

    // Cancel Global Editing & revert
    const handleCancelEdit = (): void => {
        syncDateDropdowns(islamicDate);
        setIsEditing(false);
    };

    // Mobile Islamic Date Edit Handlers
    const handleSaveIslamicDate = async (): Promise<void> => {
        setIsSaving(true);
        try {
            if (typeof saveAllSettings === 'function') {
                await saveAllSettings(draftTimes || safeManual, draftIslamicDate);
            }
            setIsEditingDate(false);
        } catch (err) {
            console.error('Error saving Islamic date:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEditIslamicDate = (): void => {
        syncDateDropdowns(islamicDate);
        setIsEditingDate(false);
    };

    // Mobile Per-Card Edit Handlers
    const handleStartEditCard = (prayerKey: PrayerName): void => {
        setDraftTimes((prev) => ({
            ...(prev || safeManual),
            [prayerKey]: { ...(safeManual[prayerKey] || { adhan: '', jamat: '' }) },
        }));
        setEditingCard(prayerKey);
    };

    const handleCancelEditCard = (prayerKey: PrayerName): void => {
        setDraftTimes((prev) => ({
            ...(prev || safeManual),
            [prayerKey]: { ...(safeManual[prayerKey] || { adhan: '', jamat: '' }) },
        }));
        setEditingCard(null);
    };

    const handleSaveCard = async (prayerKey: PrayerName): Promise<void> => {
        setIsSaving(true);
        try {
            const currentDraftObj = draftTimes || safeManual;
            const currentPrayerDraft = currentDraftObj[prayerKey] || { adhan: '', jamat: '' };

            const updatedManualTimes: ManualTimes = {
                ...safeManual,
                ...draftTimes,
                [prayerKey]: {
                    adhan: currentPrayerDraft.adhan || safeManual[prayerKey]?.adhan || '',
                    jamat: currentPrayerDraft.jamat || safeManual[prayerKey]?.jamat || '',
                },
            };

            if (typeof saveAllSettings === 'function') {
                await saveAllSettings(updatedManualTimes, draftIslamicDate || islamicDate);
            }
            setEditingCard(null);
        } catch (err) {
            console.error(`Error saving ${prayerKey}:`, err);
        } finally {
            setIsSaving(false);
        }
    };

    // Explicit Save Button Handler (Desktop / Save All)
    const handleSaveAll = async (): Promise<void> => {
        setIsSaving(true);
        try {
            if (typeof saveAllSettings === 'function') {
                await saveAllSettings(draftTimes || safeManual, draftIslamicDate);
            }
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving changes:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDraftTimeChange = (prayerKey: PrayerName, type: TimeType, value: string): void => {
        if (prayerKey === 'Maghrib' || prayerKey === 'Ishraq' || prayerKey === 'Chast') return;
        setDraftTimes((prev) => {
            const currentObj = prev || safeManual;
            const currentPrayer = currentObj[prayerKey] || { adhan: '', jamat: '' };
            return {
                ...currentObj,
                [prayerKey]: {
                    ...currentPrayer,
                    [type]: value,
                },
            };
        });
    };

    const handleLogin = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setLoginError('');

        if (!email.trim() || !password.trim()) {
            setLoginError('Please enter both email and password.');
            return;
        }

        setIsLoggingIn(true);
        try {
            if (auth) {
                await signInWithEmailAndPassword(auth, email, password);
                setEmail('');
                setPassword('');
            }
        } catch (error: any) {
            console.error('Login error:', error);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setLoginError('Invalid email or password. Please try again.');
            } else if (error.code === 'auth/too-many-requests') {
                setLoginError('Too many failed attempts. Please try again later.');
            } else {
                setLoginError(error.message || 'Failed to sign in. Please check your credentials.');
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const prayers: Array<{ name: string; key: PrayerName }> = [
        { name: 'Fajr', key: 'Fajr' },
        { name: 'Ishraq', key: 'Ishraq' },
        { name: 'Chasht', key: 'Chast' },
        { name: 'Dhuhr', key: 'Dhuhr' },
        { name: 'Asr', key: 'Asr' },
        { name: 'Maghrib', key: 'Maghrib' },
        { name: 'Isha', key: 'Isha' },
    ];

    if (authLoading) {
        return (
            <div className="admin-login-container">
                <div className="text-center p-8">
                    <RefreshCw className="animate-spin text-primary mx-auto mb-4" size={32} />
                    <p className="text-gray-600 font-serif">Checking authentication status...</p>
                </div>
            </div>
        );
    }

    if (isFirebaseConfigured && !user) {
        return (
            <div className="admin-login-container">
                <div className="admin-login-card">
                    <div className="admin-login-header">
                        <div className="admin-lock-badge">
                            <Lock size={26} />
                        </div>
                        <h2 className="admin-login-title">Admin Login</h2>
                        <p className="admin-login-subtitle">Sign in to manage prayer times and dates</p>
                    </div>

                    {loginError && (
                        <div className="admin-alert-error">
                            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{loginError}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin}>
                        <div className="admin-form-group">
                            <label className="admin-label">Email Address</label>
                            <div className="admin-input-wrapper">
                                <span className="admin-input-icon">
                                    <Mail size={18} />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@mosque.org"
                                    required
                                    className="admin-input-with-icon"
                                />
                            </div>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">Password</label>
                            <div className="admin-input-wrapper">
                                <span className="admin-input-icon">
                                    <Lock size={18} />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="admin-input-with-icon"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="admin-btn-submit"
                        >
                            {isLoggingIn ? (
                                <>
                                    <RefreshCw className="animate-spin" size={18} />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="admin-login-footer">
                        <Link to="/" className="admin-link-back">
                            <ArrowLeft size={16} /> Return to Site
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container section-padding">
            <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>

                {/* Admin Header Bar */}
                <div className="admin-header-bar">
                    <div>
                        <h2 className="admin-title">Admin Dashboard</h2>
                    </div>

                    <div className="admin-actions">
                        <Link to="/" className="btn-admin btn-admin-outline">
                            <ArrowLeft size={16} /> Site
                        </Link>
                    </div>
                </div>

                <div className="section-header text-center mb-6">
                    <div className="location-badge">
                        <MapPin size={16} />
                        <span>Silvassa, India</span>
                    </div>
                </div>

                {/* Public View Match Card */}
                <div className="prayer-card">
                    <div className="current-time-display" style={{ position: 'relative' }}>

                        {/* Save Button in Top-Left of Card during Global Edit Mode (Desktop Only) */}
                        <div className="desktop-only-view" style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                            {isEditing && (
                                <button
                                    onClick={handleSaveAll}
                                    disabled={isSaving}
                                    title="Save Changes"
                                    className="btn-card-save-top"
                                >
                                    {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                    <span>Save</span>
                                </button>
                            )}
                        </div>

                        {/* Interchanging Edit (Pencil) <-> Cancel (Cross) Button in Card Top-Right (Desktop Only) */}
                        <div className="desktop-only-view" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                            {!isEditing ? (
                                <button
                                    onClick={handleStartEdit}
                                    title="Edit All Prayer Times & Islamic Date"
                                    className="btn-card-icon"
                                >
                                    <Pencil size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    title="Cancel Editing"
                                    className="btn-card-icon"
                                >
                                    <X size={20} />
                                </button>
                            )}
                        </div>
                        <div className="time">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </div>
                        <div className="date">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </div>

                        {/* Islamic Date Display & Dropdowns */}
                        <div className="islamic-date-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {isEditing ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <select
                                        value={draftIslamicDay}
                                        onChange={(e) => handleIslamicDayChange(Number(e.target.value))}
                                        className="islamic-date-select"
                                        style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}
                                    >
                                        {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                                            <option key={d} value={d} style={{ background: '#1e3a2f', color: '#fff' }}>
                                                {d}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={draftIslamicMonth}
                                        onChange={(e) => handleIslamicMonthChange(e.target.value)}
                                        className="islamic-date-select"
                                        style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}
                                    >
                                        {HIJRI_MONTHS.map((m) => (
                                            <option key={m} value={m} style={{ background: '#1e3a2f', color: '#fff' }}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        value={draftIslamicYear}
                                        onChange={(e) => handleIslamicYearChange(Number(e.target.value))}
                                        className="islamic-date-select"
                                        style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.9rem', fontWeight: 'bold' }}
                                    >
                                        {Array.from({ length: 56 }, (_, i) => 1445 + i).map((y) => (
                                            <option key={y} value={y} style={{ background: '#1e3a2f', color: '#fff' }}>
                                                {y} AH
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : isEditingDate ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <select
                                            value={draftIslamicDay}
                                            onChange={(e) => handleIslamicDayChange(Number(e.target.value))}
                                            className="islamic-date-select"
                                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}
                                        >
                                            {Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                                                <option key={d} value={d} style={{ background: '#1e3a2f', color: '#fff' }}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={draftIslamicMonth}
                                            onChange={(e) => handleIslamicMonthChange(e.target.value)}
                                            className="islamic-date-select"
                                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}
                                        >
                                            {HIJRI_MONTHS.map((m) => (
                                                <option key={m} value={m} style={{ background: '#1e3a2f', color: '#fff' }}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={draftIslamicYear}
                                            onChange={(e) => handleIslamicYearChange(Number(e.target.value))}
                                            className="islamic-date-select"
                                            style={{ padding: '0.3rem 0.5rem', borderRadius: '0.4rem', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}
                                        >
                                            {Array.from({ length: 56 }, (_, i) => 1445 + i).map((y) => (
                                                <option key={y} value={y} style={{ background: '#1e3a2f', color: '#fff' }}>
                                                    {y} AH
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="card-action-btn-group">
                                        <button
                                            type="button"
                                            className="btn-card-action-cancel"
                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                            onClick={handleCancelEditIslamicDate}
                                            disabled={isSaving}
                                        >
                                            <X size={13} />
                                            <span>Cancel</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn-card-action-save"
                                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                                            onClick={handleSaveIslamicDate}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span className="islamic-date-display">
                                        {islamicDate}
                                    </span>
                                    <button
                                        type="button"
                                        className="btn-card-action-edit mobile-only-view"
                                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.35rem' }}
                                        onClick={() => {
                                            syncDateDropdowns(islamicDate);
                                            setIsEditingDate(true);
                                        }}
                                        title="Edit Islamic Date"
                                    >
                                        <Pencil size={12} />
                                        <span>Edit</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Integrated Active & Next Namaz Banner */}
                        <CurrentNextPrayer currentTime={currentTime} manualTimes={safeManual} />
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
                                {prayers.map((prayer) => {
                                    const prayerKey = prayer.key;
                                    const isMaghrib = prayerKey === 'Maghrib';
                                    const isNafl = prayerKey === 'Ishraq' || prayerKey === 'Chast';
                                    const startEnd = todayStartEndMap[prayerKey];

                                    const activeAdhan = isNafl
                                        ? '-'
                                        : isMaghrib
                                            ? startEnd.start
                                            : (safeManual[prayerKey]?.adhan || '-');

                                    const activeJamat = isNafl
                                        ? '-'
                                        : isMaghrib
                                            ? 'After Azaan'
                                            : (safeManual[prayerKey]?.jamat || '-');

                                    const currentDraftObj = draftTimes || safeManual;
                                    const draftAdhan = isNafl
                                        ? '-'
                                        : isMaghrib
                                            ? startEnd.start
                                            : (currentDraftObj[prayerKey]?.adhan || '');

                                    const draftJamat = isNafl
                                        ? '-'
                                        : isMaghrib
                                            ? 'After Azaan'
                                            : (currentDraftObj[prayerKey]?.jamat || '');

                                    const defaultPeriod = prayerKey === 'Fajr' ? 'AM' : 'PM';
                                    const parsedAdhan = splitTimeAndPeriod(draftAdhan, defaultPeriod);
                                    const parsedJamat = splitTimeAndPeriod(draftJamat, defaultPeriod);

                                    return (
                                        <tr key={prayerKey} className="prayer-row">
                                            <td className="prayer-name">{prayer.name}</td>

                                            {/* Start Time Column */}
                                            <td className="prayer-time">
                                                <div className="cell-content text-gray-500">{startEnd.start}</div>
                                            </td>

                                            {/* Azaan Column */}
                                            <td className="prayer-time">
                                                {!isEditing ? (
                                                    <div className="cell-content">{activeAdhan}</div>
                                                ) : (isMaghrib || isNafl) ? (
                                                    <input
                                                        type="text"
                                                        value={draftAdhan}
                                                        disabled
                                                        className="admin-table-input admin-table-input-disabled"
                                                    />
                                                ) : (
                                                    <div className="time-input-group">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9:]*"
                                                            maxLength={5}
                                                            value={parsedAdhan.time}
                                                            onChange={(e) => {
                                                                const numericOnly = e.target.value.replace(/[^0-9:]/g, '');
                                                                handleDraftTimeChange(prayerKey, 'adhan', joinTimeAndPeriod(numericOnly, parsedAdhan.period));
                                                            }}
                                                            placeholder="05:15"
                                                            className="time-box-12"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const nextPeriod = parsedAdhan.period === 'AM' ? 'PM' : 'AM';
                                                                handleDraftTimeChange(prayerKey, 'adhan', joinTimeAndPeriod(parsedAdhan.time, nextPeriod));
                                                            }}
                                                            className="period-toggle-btn"
                                                        >
                                                            {parsedAdhan.period}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Jamaat Column */}
                                            <td className="prayer-time">
                                                {!isEditing ? (
                                                    <div className="cell-content font-bold text-primary">{activeJamat}</div>
                                                ) : (isMaghrib || isNafl) ? (
                                                    <input
                                                        type="text"
                                                        value={draftJamat}
                                                        disabled
                                                        className="admin-table-input font-bold text-primary admin-table-input-disabled"
                                                    />
                                                ) : (
                                                    <div className="time-input-group">
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9:]*"
                                                            maxLength={5}
                                                            value={parsedJamat.time}
                                                            onChange={(e) => {
                                                                const numericOnly = e.target.value.replace(/[^0-9:]/g, '');
                                                                handleDraftTimeChange(prayerKey, 'jamat', joinTimeAndPeriod(numericOnly, parsedJamat.period));
                                                            }}
                                                            placeholder="05:45"
                                                            className="time-box-12 font-bold"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const nextPeriod = parsedJamat.period === 'AM' ? 'PM' : 'AM';
                                                                handleDraftTimeChange(prayerKey, 'jamat', joinTimeAndPeriod(parsedJamat.time, nextPeriod));
                                                            }}
                                                            className="period-toggle-btn"
                                                        >
                                                            {parsedJamat.period}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* End Time Column */}
                                            <td className="prayer-time">
                                                <div className="cell-content text-gray-500">{startEnd.end}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Editable Stacked Mobile Cards with Per-Card Edit & Save */}
                    <div className="prayer-mobile-list mobile-only-view">
                        {prayers.map((prayer) => {
                            const prayerKey = prayer.key;
                            const isMaghrib = prayerKey === 'Maghrib';
                            const isNafl = prayerKey === 'Ishraq' || prayerKey === 'Chast';
                            const startEnd = todayStartEndMap[prayerKey];
                            const isCardEditing = isEditing || editingCard === prayerKey;

                            const activeAdhan = isNafl
                                ? '-'
                                : isMaghrib
                                    ? startEnd.start
                                    : (safeManual[prayerKey]?.adhan || '-');

                            const activeJamat = isNafl
                                ? '-'
                                : isMaghrib
                                    ? 'After Azaan'
                                    : (safeManual[prayerKey]?.jamat || '-');

                            const currentDraftObj = draftTimes || safeManual;
                            const draftAdhan = isNafl
                                ? '-'
                                : isMaghrib
                                    ? startEnd.start
                                    : (currentDraftObj[prayerKey]?.adhan !== undefined ? currentDraftObj[prayerKey].adhan : activeAdhan);

                            const draftJamat = isNafl
                                ? '-'
                                : isMaghrib
                                    ? 'After Azaan'
                                    : (currentDraftObj[prayerKey]?.jamat !== undefined ? currentDraftObj[prayerKey].jamat : activeJamat);

                            const defaultPeriod = prayerKey === 'Fajr' ? 'AM' : 'PM';
                            const parsedAdhan = splitTimeAndPeriod(draftAdhan, defaultPeriod);
                            const parsedJamat = splitTimeAndPeriod(draftJamat, defaultPeriod);

                            return (
                                <div key={prayerKey} className="prayer-mobile-card">
                                    <div className="prayer-mobile-card-top">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span className="prayer-mobile-name">{prayer.name}</span>
                                            {isNafl && <span className="nafl-badge">Nafl</span>}
                                        </div>

                                        {/* Per-Card Edit / Save Buttons for Mobile */}
                                        {!isNafl && !isMaghrib && !isEditing && (
                                            <div>
                                                {editingCard !== prayerKey ? (
                                                    <button
                                                        type="button"
                                                        className="btn-card-action-edit"
                                                        onClick={() => handleStartEditCard(prayerKey)}
                                                    >
                                                        <Pencil size={13} />
                                                        <span>Edit</span>
                                                    </button>
                                                ) : (
                                                    <div className="card-action-btn-group">
                                                        <button
                                                            type="button"
                                                            className="btn-card-action-cancel"
                                                            onClick={() => handleCancelEditCard(prayerKey)}
                                                            disabled={isSaving}
                                                        >
                                                            <X size={14} />
                                                            <span>Cancel</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn-card-action-save"
                                                            onClick={() => handleSaveCard(prayerKey)}
                                                            disabled={isSaving}
                                                        >
                                                            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                                                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isNafl ? (
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
                                        <>
                                            <div className="prayer-mobile-main-times">
                                                <div className="mobile-time-chip">
                                                    <span className="chip-label">Azaan</span>
                                                    <div className="chip-value-container">
                                                        {!isCardEditing ? (
                                                            <span className="chip-value">{activeAdhan}</span>
                                                        ) : isMaghrib ? (
                                                            <input
                                                                type="text"
                                                                value={draftAdhan}
                                                                disabled
                                                                className="admin-table-input admin-table-input-disabled"
                                                                style={{ height: '2.25rem', fontSize: '0.9rem', width: '100%', margin: 0 }}
                                                            />
                                                        ) : (
                                                            <div className="time-input-group">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9:]*"
                                                                    maxLength={5}
                                                                    value={parsedAdhan.time}
                                                                    onChange={(e) => {
                                                                        const numericOnly = e.target.value.replace(/[^0-9:]/g, '');
                                                                        handleDraftTimeChange(prayerKey, 'adhan', joinTimeAndPeriod(numericOnly, parsedAdhan.period));
                                                                    }}
                                                                    placeholder="05:15"
                                                                    className="time-box-12"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextPeriod = parsedAdhan.period === 'AM' ? 'PM' : 'AM';
                                                                        handleDraftTimeChange(prayerKey, 'adhan', joinTimeAndPeriod(parsedAdhan.time, nextPeriod));
                                                                    }}
                                                                    className="period-toggle-btn"
                                                                >
                                                                    {parsedAdhan.period}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mobile-time-chip jamat-chip">
                                                    <span className="chip-label">Jamaat</span>
                                                    <div className="chip-value-container">
                                                        {!isCardEditing ? (
                                                            <span className="chip-value">{activeJamat}</span>
                                                        ) : isMaghrib ? (
                                                            <input
                                                                type="text"
                                                                value="After Azaan"
                                                                disabled
                                                                className="admin-table-input font-bold text-primary admin-table-input-disabled"
                                                                style={{ height: '2.25rem', fontSize: '0.85rem', width: '100%', margin: 0 }}
                                                            />
                                                        ) : (
                                                            <div className="time-input-group">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    pattern="[0-9:]*"
                                                                    maxLength={5}
                                                                    value={parsedJamat.time}
                                                                    onChange={(e) => {
                                                                        const numericOnly = e.target.value.replace(/[^0-9:]/g, '');
                                                                        handleDraftTimeChange(prayerKey, 'jamat', joinTimeAndPeriod(numericOnly, parsedJamat.period));
                                                                    }}
                                                                    placeholder="05:45"
                                                                    className="time-box-12 font-bold"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextPeriod = parsedJamat.period === 'AM' ? 'PM' : 'AM';
                                                                        handleDraftTimeChange(prayerKey, 'jamat', joinTimeAndPeriod(parsedJamat.time, nextPeriod));
                                                                    }}
                                                                    className="period-toggle-btn"
                                                                >
                                                                    {parsedJamat.period}
                                                                </button>
                                                            </div>
                                                        )}
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
                        })}
                    </div>

                    {/* Dedicated Editable Jummah Section */}
                    {(() => {
                        const isJummahEditing = isEditing || editingCard === 'Jummah';
                        const currentDraftObj = draftTimes || safeManual;
                        const azaanDraftVal = currentDraftObj.Jummah?.adhan || '';
                        const parsedAzaan = splitTimeAndPeriod(azaanDraftVal, 'PM');
                        const activeAzaan = safeManual.Jummah?.adhan || '-';

                        const khutbaDraftVal = currentDraftObj.Jummah?.jamat || '';
                        const parsedKhutba = splitTimeAndPeriod(khutbaDraftVal, 'PM');
                        const activeKhutba = safeManual.Jummah?.jamat || '-';

                        return (
                            <div className="jummah-card">
                                <div className="jummah-header">
                                    <span className="jummah-title">Jummah</span>

                                    {/* Per-Card Edit / Save for Jummah */}
                                    {!isEditing && (
                                        <div>
                                            {editingCard !== 'Jummah' ? (
                                                <button
                                                    type="button"
                                                    className="btn-card-action-edit"
                                                    onClick={() => handleStartEditCard('Jummah')}
                                                >
                                                    <Pencil size={13} />
                                                    <span>Edit</span>
                                                </button>
                                            ) : (
                                                <div className="card-action-btn-group">
                                                    <button
                                                        type="button"
                                                        className="btn-card-action-cancel"
                                                        onClick={() => handleCancelEditCard('Jummah')}
                                                        disabled={isSaving}
                                                    >
                                                        <X size={14} />
                                                        <span>Cancel</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-card-action-save"
                                                        onClick={() => handleSaveCard('Jummah')}
                                                        disabled={isSaving}
                                                    >
                                                        {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                                                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="jummah-times-grid">
                                    <div className="jummah-time-item">
                                        <span className="jummah-time-label">Azaan</span>
                                        <div className="jummah-time-value-container">
                                            {!isJummahEditing ? (
                                                <span className="jummah-time-value">{activeAzaan}</span>
                                            ) : (
                                                <div className="time-input-group">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9:]*"
                                                        maxLength={5}
                                                        value={parsedAzaan.time}
                                                        onChange={(e) => {
                                                            const numericOnly = e.target.value.replace(/[^0-9:]/g, '');
                                                            handleDraftTimeChange('Jummah', 'adhan', joinTimeAndPeriod(numericOnly, parsedAzaan.period));
                                                        }}
                                                        placeholder="01:00"
                                                        className="time-box-12 font-bold"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextPeriod = parsedAzaan.period === 'AM' ? 'PM' : 'AM';
                                                            handleDraftTimeChange('Jummah', 'adhan', joinTimeAndPeriod(parsedAzaan.time, nextPeriod));
                                                        }}
                                                        className="period-toggle-btn"
                                                    >
                                                        {parsedAzaan.period}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="jummah-time-item highlight">
                                        <span className="jummah-time-label">Khutba</span>
                                        <div className="jummah-time-value-container">
                                            {!isJummahEditing ? (
                                                <span className="jummah-time-value font-bold text-primary">{activeKhutba}</span>
                                            ) : (
                                                <div className="time-input-group">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9:]*"
                                                        maxLength={5}
                                                        value={parsedKhutba.time}
                                                        onChange={(e) => {
                                                            const numericOnly = e.target.value.replace(/[^0-9:]/g, '');
                                                            handleDraftTimeChange('Jummah', 'jamat', joinTimeAndPeriod(numericOnly, parsedKhutba.period));
                                                        }}
                                                        placeholder="01:30"
                                                        className="time-box-12 font-bold"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextPeriod = parsedKhutba.period === 'AM' ? 'PM' : 'AM';
                                                            handleDraftTimeChange('Jummah', 'jamat', joinTimeAndPeriod(parsedKhutba.time, nextPeriod));
                                                        }}
                                                        className="period-toggle-btn"
                                                    >
                                                        {parsedKhutba.period}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Reserved Footer Area for Desktop / Bottom Save Button */}
                    <div className="prayer-card-footer">
                        <div style={{
                            visibility: isEditing ? 'visible' : 'hidden',
                            opacity: isEditing ? 1 : 0,
                            pointerEvents: isEditing ? 'auto' : 'none',
                            transition: 'opacity 0.2s ease, visibility 0.2s ease'
                        }}>
                            <button
                                onClick={handleSaveAll}
                                disabled={isSaving || !isEditing}
                                className="btn-admin btn-admin-save"
                                style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', borderRadius: '0.5rem' }}
                            >
                                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Admin;
