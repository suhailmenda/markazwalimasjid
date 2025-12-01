import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import axios from 'axios';

const PrayerContext = createContext();

// Islamic calendar month names
const ISLAMIC_MONTHS = [
    'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
    'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
];

// Default days in each Islamic month (all 30 by default, admin can override to 29)
const DEFAULT_MONTH_DAYS = 30;

// Parse Islamic date string (e.g., "Jumada II 10, 1447 AH")
const parseIslamicDate = (dateString) => {
    if (!dateString) return null;
    
    // Handle "Jumada II" or "Jumada al-thani" format
    const normalized = dateString.replace(/Jumada\s+II/gi, 'Jumada al-thani')
                                 .replace(/Jumada\s+I/gi, 'Jumada al-awwal')
                                 .replace(/Rabi'\s+II/gi, 'Rabi\' al-thani')
                                 .replace(/Rabi'\s+I/gi, 'Rabi\' al-awwal')
                                 .replace(/Dhu\s+al-Qi'dah/gi, 'Dhu al-Qi\'dah')
                                 .replace(/Dhu\s+al-Hijjah/gi, 'Dhu al-Hijjah');
    
    const match = normalized.match(/(\w+(?:\s+\w+)*)\s+(\d+),\s*(\d+)/i);
    if (!match) return null;
    
    const monthName = match[1].trim();
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    
    const monthIndex = ISLAMIC_MONTHS.findIndex(m => 
        m.toLowerCase() === monthName.toLowerCase()
    );
    
    if (monthIndex === -1) return null;
    
    return { day, month: monthIndex, year, monthName: ISLAMIC_MONTHS[monthIndex] };
};

// Validate Islamic date
const validateIslamicDate = (day, month, year, customMonthLengths = {}) => {
    if (day < 1 || day > 30) return false;
    if (month < 0 || month > 11) return false;
    if (year < 1) return false;
    
    // Check if day is valid for the month
    // Use custom length if set, otherwise default to 30
    const monthKey = `${year}-${month}`;
    const maxDays = customMonthLengths[monthKey] || DEFAULT_MONTH_DAYS;
    if (day > maxDays) return false;
    
    return true;
};

// Format Islamic date
const formatIslamicDate = (day, month, year) => {
    const monthName = ISLAMIC_MONTHS[month];
    // Use "II" format for second months
    const displayMonth = monthName === 'Jumada al-thani' ? 'Jumada II' :
                         monthName === 'Jumada al-awwal' ? 'Jumada I' :
                         monthName === 'Rabi\' al-thani' ? 'Rabi\' II' :
                         monthName === 'Rabi\' al-awwal' ? 'Rabi\' I' : monthName;
    return `${displayMonth} ${day}, ${year} AH`;
};

// Increment Islamic date by one day
const incrementIslamicDate = (day, month, year, customMonthLengths = {}) => {
    let newDay = day + 1;
    let newMonth = month;
    let newYear = year;
    
    // Use custom length if set, otherwise default to 30
    const monthKey = `${year}-${month}`;
    const maxDays = customMonthLengths[monthKey] || DEFAULT_MONTH_DAYS;
    
    if (newDay > maxDays) {
        newDay = 1;
        newMonth = (month + 1) % 12;
        if (newMonth === 0) {
            newYear++;
        }
    }
    
    return { day: newDay, month: newMonth, year: newYear };
};

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

    const [manualIslamicDate, setManualIslamicDate] = useState('');
    const [islamicDateData, setIslamicDateData] = useState(() => {
        const saved = localStorage.getItem('manualIslamicDate');
        if (!saved) return null;
        
        try {
            const data = JSON.parse(saved);
            // New format: { baseDate: {day, month, year}, setDate: timestamp, lastIncrement: timestamp }
            if (data.baseDate) {
                return data;
            }
            // Legacy format: { value, date }
            const today = new Date().toDateString();
            if (data.date === today) {
                // Convert legacy format to new format
                const parsed = parseIslamicDate(data.value);
                if (parsed) {
                    return {
                        baseDate: { day: parsed.day, month: parsed.month, year: parsed.year },
                        setDate: new Date().toISOString(),
                        lastIncrement: new Date().toISOString()
                    };
                }
            }
            return null;
        } catch {
            return null;
        }
    });

    const formatTime = (timeString) => {
        if (!timeString) return null;
        if (timeString.match(/^\d{2}:\d{2}$/)) return timeString;
        return timeString.split(' ')[0];
    };

    // Calculate current Islamic date based on base date and days elapsed
    const calculateCurrentIslamicDate = useCallback((data) => {
        const { baseDate, lastIncrement, customMonthLengths = {} } = data;
        let { day, month, year } = baseDate;
        
        const now = new Date();
        const lastUpdate = lastIncrement ? new Date(lastIncrement) : new Date(data.setDate);
        
        // Get today's Maghrib time
        let daysToAdd = 0;
        if (prayerTimes?.Maghrib) {
            const maghribTime = formatTime(prayerTimes.Maghrib);
            if (maghribTime) {
                const [maghribHour, maghribMin] = maghribTime.split(':').map(Number);
                const today = new Date();
                const maghribToday = new Date(today);
                maghribToday.setHours(maghribHour, maghribMin, 0, 0);
                
                // Count how many Maghrib times have passed since last update
                let checkDate = new Date(lastUpdate);
                checkDate.setHours(maghribHour, maghribMin, 0, 0);
                
                // If last update was before today's Maghrib, start counting from today's Maghrib
                if (checkDate < maghribToday) {
                    checkDate = new Date(maghribToday);
                }
                
                // Count days: for each day that has passed Maghrib, increment
                while (checkDate <= now) {
                    daysToAdd++;
                    checkDate = new Date(checkDate);
                    checkDate.setDate(checkDate.getDate() + 1);
                    checkDate.setHours(maghribHour, maghribMin, 0, 0);
                }
            } else {
                // Fallback: use simple day calculation if Maghrib time not available
                const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
                daysToAdd = daysSinceUpdate;
            }
        } else {
            // Fallback: use simple day calculation if prayer times not loaded
            const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));
            daysToAdd = daysSinceUpdate;
        }
        
        // Increment the date using custom month lengths
        for (let i = 0; i < daysToAdd; i++) {
            const incremented = incrementIslamicDate(day, month, year, customMonthLengths);
            day = incremented.day;
            month = incremented.month;
            year = incremented.year;
        }
        
        return formatIslamicDate(day, month, year);
    }, [prayerTimes]);

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

    // Calculate and update Islamic date when data or prayerTimes changes
    const currentIslamicDate = useMemo(() => {
        if (!islamicDateData?.baseDate) {
            return '';
        }
        return calculateCurrentIslamicDate(islamicDateData);
    }, [islamicDateData, calculateCurrentIslamicDate]);

    useEffect(() => {
        setManualIslamicDate(currentIslamicDate);
    }, [currentIslamicDate]);

    // Update Islamic date at sunset and periodically
    useEffect(() => {
        if (!islamicDateData?.baseDate) return;
        
        const updateIslamicDate = () => {
            const newDate = calculateCurrentIslamicDate(islamicDateData);
            setManualIslamicDate(newDate);
            
            // Update last increment timestamp
            const updatedData = {
                ...islamicDateData,
                lastIncrement: new Date().toISOString()
            };
            setIslamicDateData(updatedData);
            localStorage.setItem('manualIslamicDate', JSON.stringify(updatedData));
        };

        // Check at Maghrib time (sunset) and every 5 minutes
        const checkMaghrib = () => {
            if (!prayerTimes?.Maghrib) return;
            
            const maghribTime = formatTime(prayerTimes.Maghrib);
            if (!maghribTime) return;
            
            const [hour, min] = maghribTime.split(':').map(Number);
            const now = new Date();
            const maghrib = new Date(now);
            maghrib.setHours(hour, min, 0, 0);
            
            // If we just passed Maghrib, update immediately
            if (now >= maghrib && now - maghrib < 60000) { // Within 1 minute
                updateIslamicDate();
            }
        };

        // Initial check
        updateIslamicDate();
        checkMaghrib();

        // Check every 5 minutes
        const interval = setInterval(() => {
            updateIslamicDate();
            checkMaghrib();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [prayerTimes, islamicDateData, calculateCurrentIslamicDate]);

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

    const updateIslamicDate = (value) => {
        if (!value || value.trim() === '') {
            setManualIslamicDate('');
            setIslamicDateData(null);
            localStorage.removeItem('manualIslamicDate');
            return { valid: true };
        }
        
        // Parse and validate the date
        const parsed = parseIslamicDate(value);
        if (!parsed) {
            return { 
                valid: false, 
                error: 'Invalid date format. Use format: "Month Day, Year AH" (e.g., "Jumada II 10, 1447 AH")' 
            };
        }
        
        // Basic validation (day must be 1-30)
        if (parsed.day < 1 || parsed.day > 30) {
            return { 
                valid: false, 
                error: 'Day must be between 1 and 30.' 
            };
        }
        
        // Load existing custom month lengths
        const existingData = islamicDateData;
        const existingCustomLengths = existingData?.customMonthLengths || {};
        const customMonthLengths = { ...existingCustomLengths };
        
        // Logic: If admin sets day 1 of a month, it means the PREVIOUS month was 29 days (moon was sighted)
        // If admin doesn't set anything, months default to 30 days
        if (parsed.day === 1 && parsed.month > 0) {
            // Admin set day 1 of current month → previous month was 29 days
            const previousMonth = parsed.month - 1;
            const previousMonthKey = `${parsed.year}-${previousMonth}`;
            customMonthLengths[previousMonthKey] = 29;
        } else if (parsed.day === 1 && parsed.month === 0) {
            // Day 1 of Muharram (first month) → previous year's Dhu al-Hijjah was 29 days
            const previousYear = parsed.year - 1;
            const previousMonthKey = `${previousYear}-11`; // Dhu al-Hijjah is month 11
            customMonthLengths[previousMonthKey] = 29;
        }
        // If admin sets any other day, it's just a date correction - don't change month lengths
        
        // Validate: Check if the day is valid for this month
        // If this month was previously marked as 29 days, validate against that
        const currentMonthKey = `${parsed.year}-${parsed.month}`;
        const monthLength = customMonthLengths[currentMonthKey] || DEFAULT_MONTH_DAYS;
        
        if (parsed.day > monthLength) {
            return { 
                valid: false, 
                error: `Invalid day. ${parsed.monthName} can only have ${monthLength} days.` 
            };
        }
        
        // Store base date with timestamp and custom month lengths
        // When admin changes date, it becomes the new base date
        const data = {
            baseDate: {
                day: parsed.day,
                month: parsed.month,
                year: parsed.year
            },
            setDate: new Date().toISOString(),
            lastIncrement: new Date().toISOString(),
            customMonthLengths: customMonthLengths
        };
        
        localStorage.setItem('manualIslamicDate', JSON.stringify(data));
        setIslamicDateData(data);
        setManualIslamicDate(formatIslamicDate(parsed.day, parsed.month, parsed.year));
        
        return { valid: true };
    };

    return (
        <PrayerContext.Provider value={{ 
            prayerTimes, 
            manualTimes, 
            loading, 
            updateManualTime, 
            manualIslamicDate, 
            updateIslamicDate,
            formatIslamicDate,
            parseIslamicDate,
            validateIslamicDate
        }}>
            {children}
        </PrayerContext.Provider>
    );
};
