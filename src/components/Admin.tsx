import React, { useState, useEffect } from 'react';
import { Pencil, Save, X, ArrowLeft, LogIn, Lock, Mail, ShieldAlert, RefreshCw, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { auth, isFirebaseConfigured } from '../firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, type User } from 'firebase/auth';
import type { AladhanTimings, ManualTimes, PrayerName, SaveStatus, TimeType } from '../types/prayer';
import './Admin.css';
import './PrayerTimes.css';

const DEFAULT_TIMES: ManualTimes = {
    Fajr: { adhan: '05:15', jamat: '05:45' },
    Dhuhr: { adhan: '12:45', jamat: '13:30' },
    Asr: { adhan: '16:45', jamat: '17:15' },
    Maghrib: { adhan: '19:05', jamat: '19:15' },
    Isha: { adhan: '20:30', jamat: '21:00' },
    Jummah: { adhan: '13:00', jamat: '13:30' },
};

interface AdminProps {
    prayerTimes?: AladhanTimings | null;
    manualTimes?: ManualTimes;
    saveAllSettings?: (newManualTimes: ManualTimes, newIslamicDate: string) => Promise<void>;
    manualIslamicDate?: string;
    saveStatus?: SaveStatus;
}

const Admin: React.FC<AdminProps> = ({
    prayerTimes,
    manualTimes,
    saveAllSettings,
    manualIslamicDate = '',
}) => {
    const [currentTime, setCurrentTime] = useState<Date>(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const getIslamicDate = (): string => {
        try {
            return new Intl.DateTimeFormat('en-TN-u-ca-islamic', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                timeZone: 'Asia/Kolkata'
            }).format(currentTime);
        } catch (e) {
            try {
                return new Intl.DateTimeFormat('en-US-u-ca-islamic', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                }).format(currentTime);
            } catch (err) {
                return '';
            }
        }
    };

    const calculatedIslamicDate = getIslamicDate();
    const safeManual = manualTimes || DEFAULT_TIMES;

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

    // Explicit Save Button Handler
    const handleSaveAll = async (): Promise<void> => {
        setIsSaving(true);
        try {
            if (typeof saveAllSettings === 'function') {
                await saveAllSettings(draftTimes, draftIslamicDate);
            }
            setIsEditing(false);
        } catch (err) {
            console.error('Error saving changes:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDraftTimeChange = (prayerKey: PrayerName, type: TimeType, value: string): void => {
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

    const formatTime = (timeString: string | undefined): string => {
        if (!timeString || typeof timeString !== 'string') return '';
        if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
        return timeString.split(' ')[0];
    };

    const prayers: Array<{ name: string; key: PrayerName }> = [
        { name: 'Fajr', key: 'Fajr' },
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
            <div className="container" style={{ maxWidth: '850px', margin: '0 auto' }}>
                
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
                        
                        {/* Edit Icon / Save & Cancel controls embedded inside time & date card */}
                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {!isEditing ? (
                                <button
                                    onClick={handleStartEdit}
                                    title="Edit Prayer Times & Islamic Date"
                                    style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        color: '#ffffff',
                                        border: '1px solid rgba(255, 255, 255, 0.35)',
                                        borderRadius: '50%',
                                        width: '2.5rem',
                                        height: '2.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <Pencil size={18} />
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={isSaving}
                                        title="Save Changes"
                                        style={{
                                            backgroundColor: '#059669',
                                            color: '#ffffff',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            padding: '0.45rem 0.9rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            fontWeight: 600,
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                                        }}
                                    >
                                        {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                                        <span>Save</span>
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={isSaving}
                                        title="Cancel Editing"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            color: '#ffffff',
                                            border: '1px solid rgba(255, 255, 255, 0.35)',
                                            borderRadius: '50%',
                                            width: '2.25rem',
                                            height: '2.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </>
                            )}
                        </div>

                        <Clock className="mb-2 text-gold" size={32} />
                        <div className="time">
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </div>
                        <div className="date">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </div>
                        
                        {!isEditing ? (
                            <div className="islamic-date-display">
                                {manualIslamicDate || calculatedIslamicDate}
                            </div>
                        ) : (
                            <div style={{ marginTop: '0.75rem', width: '100%', maxWidth: '400px', backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.25)' }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, color: '#ecfdf5', marginBottom: '0.35rem' }}>
                                    Islamic Date (Hijri) - Editable
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={draftIslamicDate}
                                        onChange={(e) => setDraftIslamicDate(e.target.value)}
                                        placeholder="e.g. Rabiʻ I 12, 1448 AH"
                                        style={{ width: '100%', padding: '0.4rem 0.75rem', borderRadius: '0.375rem', color: '#0f172a', fontFamily: 'var(--font-serif)', fontSize: '0.9rem', backgroundColor: '#ffffff', border: 'none' }}
                                    />
                                    {draftIslamicDate && (
                                        <button
                                            type="button"
                                            onClick={() => setDraftIslamicDate(calculatedIslamicDate)}
                                            title="Reset to Auto-calculated Date"
                                            style={{ backgroundColor: '#064e3b', color: '#ffffff', fontSize: '0.75rem', padding: '0.4rem 0.6rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                        >
                                            Auto
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
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
                                {prayers.map((prayer) => {
                                    const prayerKey = prayer.key;
                                    const apiTime = prayerTimes && prayerTimes[prayerKey] ? formatTime(prayerTimes[prayerKey]) : '';
                                    const defaultAdhan = DEFAULT_TIMES[prayerKey]?.adhan || apiTime || '-';
                                    const defaultJamat = DEFAULT_TIMES[prayerKey]?.jamat || '-';

                                    // Active saved values
                                    const activeAdhan = safeManual[prayerKey]?.adhan || defaultAdhan;
                                    const activeJamat = safeManual[prayerKey]?.jamat || defaultJamat;

                                    // Draft values during Edit Mode
                                    const currentDraftObj = draftTimes || safeManual;
                                    const draftAdhan = currentDraftObj[prayerKey]?.adhan !== undefined ? currentDraftObj[prayerKey].adhan : activeAdhan;
                                    const draftJamat = currentDraftObj[prayerKey]?.jamat !== undefined ? currentDraftObj[prayerKey].jamat : activeJamat;

                                    return (
                                        <tr key={prayerKey} className="prayer-row">
                                            <td className="prayer-name">{prayer.name}</td>
                                            
                                            {/* Adhan Column */}
                                            <td className="prayer-time">
                                                {!isEditing ? (
                                                    activeAdhan
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={draftAdhan}
                                                        onChange={(e) => handleDraftTimeChange(prayerKey, 'adhan', e.target.value)}
                                                        placeholder="e.g. 05:15"
                                                        className="admin-table-input"
                                                    />
                                                )}
                                            </td>

                                            {/* Jamat Column */}
                                            <td className="prayer-time font-bold text-primary">
                                                {!isEditing ? (
                                                    activeJamat
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={draftJamat}
                                                        onChange={(e) => handleDraftTimeChange(prayerKey, 'jamat', e.target.value)}
                                                        placeholder="e.g. 05:45"
                                                        className="admin-table-input font-bold"
                                                    />
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
