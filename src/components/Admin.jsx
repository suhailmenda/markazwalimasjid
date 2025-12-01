import React, { useState, useEffect } from 'react';
import { usePrayerTimes } from '../context/PrayerContext';
import { Lock, Save, ArrowLeft, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import './Admin.css';

const Admin = () => {
    const { manualTimes, updateManualTime, manualIslamicDate, updateIslamicDate } = usePrayerTimes();
    const [user, setUser] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [islamicDateInput, setIslamicDateInput] = useState(manualIslamicDate || '');
    const [islamicDateError, setIslamicDateError] = useState('');

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        setIslamicDateInput(manualIslamicDate || '');
    }, [manualIslamicDate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message);
            console.error(err);
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.error(err);
        }
    };

    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jummah'];

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return (
            <div className="admin-login-container">
                <div className="admin-card">
                    <div className="text-center mb-6">
                        <Lock className="mx-auto text-primary mb-2" size={48} />
                        <h2 className="text-2xl font-serif font-bold text-primary-dark">Admin Access</h2>
                    </div>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                className="admin-input mb-3"
                                required
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                className="admin-input"
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        <button type="submit" className="btn btn-primary w-full">Login</button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link to="/" className="text-sm text-gray-500 hover:text-primary">Back to Home</Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-container section-padding">
            <div className="container">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-serif font-bold text-primary-dark">Manage Prayer Times</h2>
                    <div className="flex gap-4">
                        <Link to="/" className="btn btn-outline text-primary-dark border-primary-dark hover:bg-primary hover:text-white">
                            <ArrowLeft size={18} className="mr-2" /> Back to Home
                        </Link>
                        <button onClick={handleLogout} className="btn btn-outline text-red-500 border-red-500 hover:bg-red-500 hover:text-white">
                            <LogOut size={18} className="mr-2" /> Logout
                        </button>
                    </div>
                </div>

                <div className="admin-card">
                    <div className="mb-6 pb-6 border-b border-gray-200">
                        <label className="block text-sm font-serif font-bold text-primary-dark mb-2">
                            Islamic Date (Hijri)
                        </label>
                        <input
                            type="text"
                            value={islamicDateInput}
                            onChange={(e) => {
                                setIslamicDateInput(e.target.value);
                                setIslamicDateError('');
                            }}
                            onBlur={(e) => {
                                const result = updateIslamicDate(e.target.value);
                                if (!result.valid) {
                                    setIslamicDateError(result.error);
                                } else {
                                    setIslamicDateError('');
                                    setIslamicDateInput(manualIslamicDate || '');
                                }
                            }}
                            placeholder="e.g. Jumada II 10, 1447 AH"
                            className={`admin-input ${islamicDateError ? 'border-red-500' : ''}`}
                        />
                        {islamicDateError && (
                            <p className="text-xs text-red-500 mt-1">{islamicDateError}</p>
                        )}
                        <div className="text-xs text-gray-500 mt-2 space-y-1">
                            <p>
                                Leave empty to use automatic calculation. Date will increment automatically at sunset (Maghrib).
                            </p>
                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <p className="font-semibold text-blue-900 mb-1">How it works:</p>
                                <ul className="list-disc list-inside space-y-1 text-blue-800">
                                    <li><strong>Default:</strong> All months are 30 days - system automatically goes to day 30</li>
                                    <li><strong>Moon sighted:</strong> When moon is sighted on day 29, set the date to day 1 of NEXT month (e.g., "Shawwal 1, 1447") - system marks previous month as 29 days</li>
                                    <li><strong>Moon not sighted:</strong> Do nothing - system continues to day 30 automatically</li>
                                    <li><strong>Date correction:</strong> Set any date to correct/adjust (e.g., "Ramadan 15, 1447")</li>
                                    <li><strong>Auto-increment:</strong> Date increments daily at sunset from your last set date</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-100">
                                    <th className="text-left p-4 font-serif text-primary-dark">Prayer</th>
                                    <th className="text-left p-4 font-serif text-primary-dark">Adhan Time</th>
                                    <th className="text-left p-4 font-serif text-primary-dark">Jamat Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prayers.map((prayer) => (
                                    <tr key={prayer} className="border-b border-gray-100">
                                        <td className="p-4 font-bold">{prayer}</td>
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                value={manualTimes[prayer]?.adhan || ''}
                                                onChange={(e) => updateManualTime(prayer, 'adhan', e.target.value)}
                                                placeholder="e.g. 05:30"
                                                className="admin-input-small"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <input
                                                type="text"
                                                value={manualTimes[prayer]?.jamat || ''}
                                                onChange={(e) => updateManualTime(prayer, 'jamat', e.target.value)}
                                                placeholder="e.g. 06:00"
                                                className="admin-input-small"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-6 text-right">
                        <p className="text-sm text-gray-500 flex items-center justify-end gap-2">
                            <Save size={16} /> Changes are saved automatically
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
