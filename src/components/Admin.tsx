import React, { useState, useEffect } from 'react';
import { Pencil, Save, X, ArrowLeft, LogIn, Lock, Mail, ShieldAlert, RefreshCw, Clock, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, type User } from 'firebase/auth';
import type { AladhanTimings, ManualTimes, PrayerName, SaveStatus, TimeType } from '../types/prayer';
import { getIslamicDateAtSunset } from '../utils/sunsetScheduler';
import { getTodayPrayerStartEndMap } from '../utils/prayerStartEnd';
import { formatTo12HourDisplay } from '../utils/timeFormat';
import './Admin.css';
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

export interface Time12Parts {
    time12: string; // e.g. "05:15"
    period: 'AM' | 'PM';
}

export const isValid12HourTime = (timeStr: string): boolean => {
    if (!timeStr) return false;
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return false;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    if (hours < 1 || hours > 12) return false;
    if (minutes < 0 || minutes > 59) return false;

    return true;
};

export const parseStoredTimeTo12Hour = (storedStr: string): Time12Parts => {
    if (!storedStr || storedStr === 'After Azaan' || storedStr === '-') {
        return { time12: storedStr, period: 'AM' };
    }

    const clean = storedStr.trim();
    if (clean.toUpperCase().includes('AM')) {
        const timeVal = clean.toUpperCase().replace('AM', '').trim();
        return { time12: timeVal, period: 'AM' };
    }
    if (clean.toUpperCase().includes('PM')) {
        const timeVal = clean.toUpperCase().replace('PM', '').trim();
        return { time12: timeVal, period: 'PM' };
    }

    const match = clean.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return { time12: storedStr, period: 'AM' };

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM';

    if (hours === 0) {
        hours = 12;
    } else if (hours > 12) {
        hours = hours - 12;
    }

    const formattedHours = hours.toString().padStart(2, '0');
    return { time12: `${formattedHours}:${minutes}`, period };
};

export const combine12HourToStored = (time12: string, period: 'AM' | 'PM'): string => {
    if (!time12 || time12 === 'After Azaan' || time12 === '-') return time12;

    const match = time12.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return time12;

    let hours = parseInt(match[1], 10);
    const minutes = match[2];

    const periodLower = period.toLowerCase();
    const formattedHours = hours.toString().padStart(2, '0');
    return `${formattedHours}:${minutes} ${periodLower}`;
};

interface AdminProps {
    prayerTimes?: AladhanTimings | null;
    manualTimes?: ManualTimes;
    saveAllSettings?: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
    syncApiTimesNow?: () => Promise<void>;
    manualIslamicDate?: string;
    apiIslamicDate?: string;
    saveStatus?: SaveStatus;
}

const Admin: React.FC<AdminProps> = ({
    manualTimes,
    saveAllSettings,
    manualIslamicDate = '',
    apiIslamicDate = '',
}) => {
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const safeManual = manualTimes || DEFAULT_TIMES;
    const { map: todayStartEndMap } = getTodayPrayerStartEndMap(currentTime);
    const maghribAdhanStr = todayStartEndMap.Maghrib.start || safeManual.Maghrib?.adhan || '7:04 pm';

    // Helper to get Islamic Date (Hijri) with auto sunset (+1 day) transition
    const calculatedIslamicDate = apiIslamicDate || getIslamicDateAtSunset(currentTime, maghribAdhanStr);

    // Edit Mode State (DO NOT AUTO-SAVE)
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [draftTimes, setDraftTimes] = useState<ManualTimes>(() => safeManual);
    const [draftIslamicDate, setDraftIslamicDate] = useState<string>(manualIslamicDate || calculatedIslamicDate);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    
    // Sync draftTimes when manualTimes updates and not currently editing
    useEffect(() => {
        if (!isEditing) {
            setDraftTimes(safeManual);
            setDraftIslamicDate(manualIslamicDate || calculatedIslamicDate);
        }
    }, [manualTimes, manualIslamicDate, isEditing, calculatedIslamicDate, safeManual]);

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

    // Enter Edit Mode & snapshot draft state
    const handleStartEdit = (): void => {
        setDraftTimes(JSON.parse(JSON.stringify(safeManual)) as ManualTimes);
        setDraftIslamicDate(manualIslamicDate || calculatedIslamicDate);
        setIsEditing(true);
    };

    // Cancel Editing & revert
    const handleCancelEdit = (): void => {
        setIsEditing(false);
    };

    // Explicit Save Button Handler with validation check
    const handleSaveAll = async (): Promise<void> => {
        setIsSaving(true);
        try {
            // Validate all draft times before saving; if any is invalid, revert to active safeManual value
            const validatedDraftTimes: ManualTimes = { ...draftTimes };
            (Object.keys(validatedDraftTimes) as PrayerName[]).forEach((pKey) => {
                if (pKey !== 'Maghrib' && pKey !== 'Ishraq' && pKey !== 'Chast') {
                    const adhanVal = validatedDraftTimes[pKey]?.adhan || '';
                    const jamatVal = validatedDraftTimes[pKey]?.jamat || '';

                    const parsedAdhan = parseStoredTimeTo12Hour(adhanVal);
                    if (!isValid12HourTime(parsedAdhan.time12)) {
                        validatedDraftTimes[pKey].adhan = safeManual[pKey]?.adhan || DEFAULT_TIMES[pKey].adhan;
                    }

                    const parsedJamat = parseStoredTimeTo12Hour(jamatVal);
                    if (!isValid12HourTime(parsedJamat.time12)) {
                        validatedDraftTimes[pKey].jamat = safeManual[pKey]?.jamat || DEFAULT_TIMES[pKey].jamat;
                    }
                }
            });

            if (typeof saveAllSettings === 'function') {
                await saveAllSettings(validatedDraftTimes, draftIslamicDate);
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

    // Validate on blur: if entered value is invalid, revert to old active value!
    const handleInputBlur = (prayerKey: PrayerName, type: TimeType, currentInputValue: string, period: 'AM' | 'PM'): void => {
        if (!isValid12HourTime(currentInputValue)) {
            // Revert to old valid value
            const oldStored = safeManual[prayerKey]?.[type] || DEFAULT_TIMES[prayerKey]?.[type] || '';
            const oldParsed = parseStoredTimeTo12Hour(oldStored);
            const revertedStored = combine12HourToStored(oldParsed.time12, oldParsed.period);
            handleDraftTimeChange(prayerKey, type, revertedStored);
        } else {
            // Standardize format and commit to draft
            const validStored = combine12HourToStored(currentInputValue, period);
            handleDraftTimeChange(prayerKey, type, validStored);
        }
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
        { name: 'Jummah', key: 'Jummah' },
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

    // Render Login Screen if Firebase is configured and user is not authenticated
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
                            <ArrowLeft size={16} /> Return to Public Site
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
                        {user && (
                            <p className="admin-user-badge">
                                <span className="user-dot"></span>
                                Logged in as <strong style={{ color: '#334155' }}>{user.email}</strong>
                            </p>
                        )}
                    </div>

                    <div className="admin-actions">
                        <Link to="/monthly-timetable" className="btn-admin btn-admin-outline" style={{ backgroundColor: '#ffffff' }}>
                            <Calendar size={16} /> Monthly Timetable
                        </Link>
                        <Link to="/" className="btn-admin btn-admin-outline">
                            <ArrowLeft size={16} /> Public Site
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
                        
                        {/* Save Button in Top-Left of Card during Edit Mode */}
                        <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
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

                        {/* Interchanging Edit (Pencil) <-> Cancel (Cross) Button in Card Top-Right */}
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                            {!isEditing ? (
                                <button
                                    onClick={handleStartEdit}
                                    title="Edit Prayer Times & Islamic Date"
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

                        <Clock className="mb-2 text-gold" size={32} />
                        <div className="time">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </div>
                        <div className="date">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </div>
                        
                        {/* Fixed Height Wrapper for Zero Layout Shift */}
                        <div className="islamic-date-container">
                            {!isEditing ? (
                                <span className="islamic-date-display">
                                    {manualIslamicDate || calculatedIslamicDate}
                                </span>
                            ) : (
                                <input
                                    type="text"
                                    value={draftIslamicDate}
                                    onChange={(e) => setDraftIslamicDate(e.target.value)}
                                    placeholder="e.g. Rabiʻ I 12, 1448 AH"
                                    className="islamic-date-input-inline"
                                />
                            )}
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
                                {prayers.map((prayer) => {
                                    const prayerKey = prayer.key;
                                    const isMaghrib = prayerKey === 'Maghrib';
                                    const isNafl = prayerKey === 'Ishraq' || prayerKey === 'Chast';
                                    const startEnd = todayStartEndMap[prayerKey] || { start: '-', end: '-' };
                                    
                                    const defaultAdhan = isNafl
                                        ? '-'
                                        : isMaghrib
                                        ? startEnd.start
                                        : (DEFAULT_TIMES[prayerKey]?.adhan || '-');

                                    const defaultJamat = isNafl
                                        ? '-'
                                        : isMaghrib
                                        ? 'After Azaan'
                                        : (DEFAULT_TIMES[prayerKey]?.jamat || '-');

                                    // Active saved values
                                    const activeAdhan = isNafl
                                        ? '-'
                                        : isMaghrib
                                        ? startEnd.start
                                        : formatTo12HourDisplay(safeManual[prayerKey]?.adhan || defaultAdhan);

                                    const activeJamat = isNafl
                                        ? '-'
                                        : isMaghrib
                                        ? 'After Azaan'
                                        : formatTo12HourDisplay(safeManual[prayerKey]?.jamat || defaultJamat);

                                    // Draft values during Edit Mode
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

                                    const parsedAdhan = parseStoredTimeTo12Hour(draftAdhan);
                                    const parsedJamat = parseStoredTimeTo12Hour(draftJamat);

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
                                                            value={parsedAdhan.time12}
                                                            onChange={(e) => {
                                                                const newStored = combine12HourToStored(e.target.value, parsedAdhan.period);
                                                                handleDraftTimeChange(prayerKey, 'adhan', newStored);
                                                            }}
                                                            onBlur={(e) => handleInputBlur(prayerKey, 'adhan', e.target.value, parsedAdhan.period)}
                                                            placeholder="05:15"
                                                            className="time-box-12"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const nextPeriod = parsedAdhan.period === 'AM' ? 'PM' : 'AM';
                                                                const newStored = combine12HourToStored(parsedAdhan.time12, nextPeriod);
                                                                handleDraftTimeChange(prayerKey, 'adhan', newStored);
                                                            }}
                                                            className="period-toggle-btn"
                                                        >
                                                            {parsedAdhan.period}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Jamaat Column */}
                                            <td className="prayer-time font-bold text-primary">
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
                                                            value={parsedJamat.time12}
                                                            onChange={(e) => {
                                                                const newStored = combine12HourToStored(e.target.value, parsedJamat.period);
                                                                handleDraftTimeChange(prayerKey, 'jamat', newStored);
                                                            }}
                                                            onBlur={(e) => handleInputBlur(prayerKey, 'jamat', e.target.value, parsedJamat.period)}
                                                            placeholder="05:45"
                                                            className="time-box-12 font-bold"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const nextPeriod = parsedJamat.period === 'AM' ? 'PM' : 'AM';
                                                                const newStored = combine12HourToStored(parsedJamat.time12, nextPeriod);
                                                                handleDraftTimeChange(prayerKey, 'jamat', newStored);
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

                    {/* Mobile View: Editable Stacked Mobile Cards */}
                    <div className="prayer-mobile-list mobile-only-view">
                        {prayers.map((prayer) => {
                            const prayerKey = prayer.key;
                            const isMaghrib = prayerKey === 'Maghrib';
                            const isNafl = prayerKey === 'Ishraq' || prayerKey === 'Chast';
                            const startEnd = todayStartEndMap[prayerKey] || { start: '-', end: '-' };

                            const defaultAdhan = isNafl
                                ? '-'
                                : isMaghrib
                                ? startEnd.start
                                : (DEFAULT_TIMES[prayerKey]?.adhan || '-');

                            const defaultJamat = isNafl
                                ? '-'
                                : isMaghrib
                                ? 'After Azaan'
                                : (DEFAULT_TIMES[prayerKey]?.jamat || '-');

                            const activeAdhan = isNafl
                                ? '-'
                                : isMaghrib
                                ? startEnd.start
                                : formatTo12HourDisplay(safeManual[prayerKey]?.adhan || defaultAdhan);

                            const activeJamat = isNafl
                                ? '-'
                                : isMaghrib
                                ? 'After Azaan'
                                : formatTo12HourDisplay(safeManual[prayerKey]?.jamat || defaultJamat);

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

                            const parsedAdhan = parseStoredTimeTo12Hour(draftAdhan);
                            const parsedJamat = parseStoredTimeTo12Hour(draftJamat);

                            return (
                                <div key={prayerKey} className="prayer-mobile-card">
                                    <div className="prayer-mobile-card-top">
                                        <span className="prayer-mobile-name">{prayer.name}</span>
                                        {isNafl && <span className="nafl-badge">Nafl</span>}
                                    </div>

                                    {isNafl ? (
                                        /* Nafl Prayers (Ishraq & Chasht): Prominently show Start and End as main time chips */
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
                                        /* Obligatory Prayers: Show Azaan & Jamaat time chips (with fixed-height edit controls in Edit Mode) */
                                        <>
                                            <div className="prayer-mobile-main-times">
                                                {/* Azaan Mobile Input / View */}
                                                <div className="mobile-time-chip">
                                                    <span className="chip-label">Azaan</span>
                                                    <div className="chip-value-container">
                                                        {!isEditing ? (
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
                                                                    value={parsedAdhan.time12}
                                                                    onChange={(e) => {
                                                                        const newStored = combine12HourToStored(e.target.value, parsedAdhan.period);
                                                                        handleDraftTimeChange(prayerKey, 'adhan', newStored);
                                                                    }}
                                                                    onBlur={(e) => handleInputBlur(prayerKey, 'adhan', e.target.value, parsedAdhan.period)}
                                                                    placeholder="05:15"
                                                                    className="time-box-12"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextPeriod = parsedAdhan.period === 'AM' ? 'PM' : 'AM';
                                                                        const newStored = combine12HourToStored(parsedAdhan.time12, nextPeriod);
                                                                        handleDraftTimeChange(prayerKey, 'adhan', newStored);
                                                                    }}
                                                                    className="period-toggle-btn"
                                                                >
                                                                    {parsedAdhan.period}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Jamaat Mobile Input / View */}
                                                <div className="mobile-time-chip jamat-chip">
                                                    <span className="chip-label">Jamaat</span>
                                                    <div className="chip-value-container">
                                                        {!isEditing ? (
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
                                                                    value={parsedJamat.time12}
                                                                    onChange={(e) => {
                                                                        const newStored = combine12HourToStored(e.target.value, parsedJamat.period);
                                                                        handleDraftTimeChange(prayerKey, 'jamat', newStored);
                                                                    }}
                                                                    onBlur={(e) => handleInputBlur(prayerKey, 'jamat', e.target.value, parsedJamat.period)}
                                                                    placeholder="05:45"
                                                                    className="time-box-12 font-bold"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const nextPeriod = parsedJamat.period === 'AM' ? 'PM' : 'AM';
                                                                        const newStored = combine12HourToStored(parsedJamat.time12, nextPeriod);
                                                                        handleDraftTimeChange(prayerKey, 'jamat', newStored);
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
