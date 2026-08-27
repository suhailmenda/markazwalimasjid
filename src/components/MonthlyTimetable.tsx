import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import prayerTimesDataJson from '../assets/prayer_times.json';
import { formatTo12HourDisplay } from '../utils/timeFormat';
import './MonthlyTimetable.css';

interface DayPrayerTiming {
  sehriEnd: string;
  subahSadiq: string;
  fajr: string;
  tulu: string;
  zawal: string;
  asr: string;
  sunset: string;
  maghrib: string;
  isha: string;
  ishraqStart?: string;
  ishraqEnd?: string;
  chashtStart?: string;
  chashtEnd?: string;
}

type PrayerTimesData = Record<string, DayPrayerTiming>;

const prayerTimesData = prayerTimesDataJson as PrayerTimesData;

interface MonthOption {
  code: string; // e.g. "Jan", "Feb"
  name: string; // e.g. "January", "February"
}

const MONTHS: MonthOption[] = [
  { code: 'Jan', name: 'January' },
  { code: 'Feb', name: 'February' },
  { code: 'Mar', name: 'March' },
  { code: 'Apr', name: 'April' },
  { code: 'May', name: 'May' },
  { code: 'Jun', name: 'June' },
  { code: 'Jul', name: 'July' },
  { code: 'Aug', name: 'August' },
  { code: 'Sep', name: 'September' },
  { code: 'Oct', name: 'October' },
  { code: 'Nov', name: 'November' },
  { code: 'Dec', name: 'December' },
];

const getCurrentMonthCode = (): string => {
  const currentMonthIndex = new Date().getMonth(); // 0 - 11
  return MONTHS[currentMonthIndex]?.code || 'Jan';
};

const MonthlyTimetable: React.FC = () => {
  const [selectedMonthCode, setSelectedMonthCode] = useState<string>(getCurrentMonthCode());

  const todayDate = new Date();
  const currentMonthIndex = todayDate.getMonth();
  const currentDayNum = todayDate.getDate();
  const isCurrentMonth = MONTHS[currentMonthIndex]?.code === selectedMonthCode;

  // Selected Day number state for mobile day view (defaults to today or day 1)
  const [selectedDayNumber, setSelectedDayNumber] = useState<number>(isCurrentMonth ? currentDayNum : 1);

  // Filter prayer times for the selected month
  const monthData = useMemo(() => {
    const entries = Object.entries(prayerTimesData).filter(([key]) => key.endsWith(`-${selectedMonthCode}`));
    return entries.map(([key, timings]) => {
      const dayPart = key.split('-')[0];
      return {
        dateKey: key,
        dayNumber: parseInt(dayPart, 10),
        formattedDate: `${dayPart} ${selectedMonthCode}`,
        timings,
      };
    }).sort((a, b) => a.dayNumber - b.dayNumber);
  }, [selectedMonthCode]);

  const selectedMonthObj = MONTHS.find((m) => m.code === selectedMonthCode) || MONTHS[0];

  // Active day data for mobile day view
  const activeDayData = useMemo(() => {
    return monthData.find((d) => d.dayNumber === selectedDayNumber) || monthData[0];
  }, [monthData, selectedDayNumber]);

  // Date strip scroll ref for auto-centering active day
  const dateStripRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (dateStripRef.current) {
      const activeEl = dateStripRef.current.querySelector('.date-ribbon-item.active') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedDayNumber, selectedMonthCode]);

  // Previous Day Handler (wraps around to last day of previous month)
  const handlePrevDay = (): void => {
    if (selectedDayNumber > 1) {
      setSelectedDayNumber((prev) => prev - 1);
    } else {
      const currentMIndex = MONTHS.findIndex((m) => m.code === selectedMonthCode);
      const prevMIndex = (currentMIndex - 1 + MONTHS.length) % MONTHS.length;
      const prevMonthCode = MONTHS[prevMIndex].code;

      const prevMonthEntries = Object.keys(prayerTimesData).filter((k) => k.endsWith(`-${prevMonthCode}`));
      const lastDayNum = prevMonthEntries.length || 31;

      setSelectedMonthCode(prevMonthCode);
      setSelectedDayNumber(lastDayNum);
    }
  };

  // Next Day Handler (wraps around to 1st day of next month)
  const handleNextDay = (): void => {
    if (monthData.length > 0 && selectedDayNumber < monthData.length) {
      setSelectedDayNumber((prev) => prev + 1);
    } else {
      const currentMIndex = MONTHS.findIndex((m) => m.code === selectedMonthCode);
      const nextMIndex = (currentMIndex + 1) % MONTHS.length;
      const nextMonthCode = MONTHS[nextMIndex].code;

      setSelectedMonthCode(nextMonthCode);
      setSelectedDayNumber(1);
    }
  };

  // Programmatically open native HTML5 date picker on card click
  const handleOpenCalendar = (): void => {
    const inputEl = dateInputRef.current;
    if (!inputEl) return;

    if (typeof inputEl.showPicker === 'function') {
      try {
        inputEl.showPicker();
        return;
      } catch (e) {
        // Fallback to focus
      }
    }
    inputEl.focus();
  };

  // Convert currently selected month & day to "YYYY-MM-DD" for HTML5 Date Input
  const selectedMonthIndex = MONTHS.findIndex((m) => m.code === selectedMonthCode);
  const currentYear = todayDate.getFullYear();
  const currentIsoDateString = `${currentYear}-${(selectedMonthIndex + 1).toString().padStart(2, '0')}-${selectedDayNumber.toString().padStart(2, '0')}`;

  const handleCalendarDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split('-');
    if (parts.length === 3) {
      const mIndex = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const targetMonthObj = MONTHS[mIndex];
      if (targetMonthObj) {
        setSelectedMonthCode(targetMonthObj.code);
        setSelectedDayNumber(dayNum);
      }
    }
  };

  return (
    <section id="monthly-schedule" className="section-padding monthly-schedule-section">
      <div className="container">
        <div className="section-header text-center">
          <h2 className="section-title">Monthly Prayer Timetable</h2>
          <p className="monthly-subtitle">Complete yearly schedule for Silvassa</p>
        </div>

        <div className="monthly-timetable-card">
          
          {/* Desktop Month Selector Header */}
          <div className="month-selector-header desktop-only-view">
            <div className="month-selector-title">
              <Calendar size={20} className="text-gold" />
              <span>Select Month:</span>
            </div>

            {/* Scrollable Month Pills */}
            <div className="month-pills-scroll-container">
              {MONTHS.map((month) => (
                <button
                  key={month.code}
                  onClick={() => {
                    setSelectedMonthCode(month.code);
                    setSelectedDayNumber(1);
                  }}
                  className={`month-pill ${selectedMonthCode === month.code ? 'active' : ''}`}
                >
                  {month.code}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table Header Info */}
          <div className="table-header-info desktop-only-view">
            <h3 className="month-heading">{selectedMonthObj.name} Schedule</h3>
            <span className="days-count-badge">{monthData.length} Days</span>
          </div>

          {/* Desktop Only 12-Column Table View */}
          <div className="monthly-table-responsive desktop-only-view">
            <table className="monthly-table">
              <colgroup>
                <col style={{ width: '110px' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
                <col style={{ width: '8.09%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th className="th-date">Date</th>
                  <th>Sehri End</th>
                  <th>Subah Sadiq</th>
                  <th>Fajr</th>
                  <th>Tulu (Sunrise)</th>
                  <th>Ishraq</th>
                  <th>Chasht</th>
                  <th>Zawal</th>
                  <th>Asr</th>
                  <th>Sunset</th>
                  <th>Maghrib</th>
                  <th>Isha</th>
                </tr>
              </thead>
              <tbody>
                {monthData.map(({ dateKey, dayNumber, formattedDate, timings }) => {
                  const isToday = isCurrentMonth && dayNumber === currentDayNum;

                  return (
                    <tr key={dateKey} className={`monthly-row ${isToday ? 'today-highlight' : ''}`}>
                      <td className="td-date">
                        <div className="date-wrapper">
                          <span className="day-text">{formattedDate}</span>
                          {isToday && <span className="today-badge">Today</span>}
                        </div>
                      </td>
                      <td>{formatTo12HourDisplay(timings.sehriEnd)}</td>
                      <td>{formatTo12HourDisplay(timings.subahSadiq)}</td>
                      <td className="font-semibold text-primary">{formatTo12HourDisplay(timings.fajr)}</td>
                      <td>{formatTo12HourDisplay(timings.tulu)}</td>
                      <td>{formatTo12HourDisplay(timings.ishraqStart)}</td>
                      <td>{formatTo12HourDisplay(timings.chashtStart)}</td>
                      <td>{formatTo12HourDisplay(timings.zawal)}</td>
                      <td>{formatTo12HourDisplay(timings.asr)}</td>
                      <td>{formatTo12HourDisplay(timings.sunset)}</td>
                      <td className="font-semibold text-primary">{formatTo12HourDisplay(timings.maghrib)}</td>
                      <td className="font-semibold text-primary">{formatTo12HourDisplay(timings.isha)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Only: Interactive Calendar Selector + Focused Day View */}
          <div className="monthly-mobile-day-container mobile-only-view">
            
            {/* Mobile Calendar Date Picker Bar (Whole Wrapper Clickable via showPicker) */}
            <div
              className="mobile-calendar-picker-wrapper"
              onClick={handleOpenCalendar}
              title="Tap to select date from calendar"
            >
              <div className="mobile-calendar-btn">
                <div className="mobile-calendar-btn-content">
                  <Calendar size={20} className="text-gold" />
                  <span className="calendar-btn-label">
                    {activeDayData ? `${activeDayData.formattedDate}` : `${selectedMonthObj.name}`}
                  </span>
                </div>
                <div className="mobile-calendar-btn-right">
                  <ChevronDown size={18} className="text-gray-400" />
                </div>
              </div>

              {/* Native HTML5 Calendar Date Input */}
              <input
                ref={dateInputRef}
                type="date"
                value={currentIsoDateString}
                onChange={handleCalendarDateChange}
                className="hidden-date-input"
              />
            </div>

            {/* Horizontal Date Ribbon Selector */}
            <div className="date-ribbon-wrapper" ref={dateStripRef}>
              {monthData.map(({ dayNumber }) => {
                const isToday = isCurrentMonth && dayNumber === currentDayNum;
                const isSelected = dayNumber === selectedDayNumber;

                return (
                  <button
                    key={dayNumber}
                    onClick={() => setSelectedDayNumber(dayNumber)}
                    className={`date-ribbon-item ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
                  >
                    <span className="ribbon-day-num">{dayNumber}</span>
                    <span className="ribbon-month-name">{selectedMonthCode}</span>
                    {isToday && <span className="ribbon-dot"></span>}
                  </button>
                );
              })}
            </div>

            {/* Active Day Hero Card */}
            {activeDayData && (
              <div className="active-day-hero-card">
                
                {/* Active Day Card Header & Prev/Next Nav */}
                <div className="active-day-header">
                  <button
                    onClick={handlePrevDay}
                    className="day-nav-btn"
                    title="Previous Day"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="active-day-title-group">
                    <span className="active-day-date">{activeDayData.formattedDate}</span>
                    {isCurrentMonth && activeDayData.dayNumber === currentDayNum && (
                      <span className="active-day-today-badge">Today</span>
                    )}
                  </div>

                  <button
                    onClick={handleNextDay}
                    className="day-nav-btn"
                    title="Next Day"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Primary Prayer Times Grid */}
                <div className="day-card-grid-primary">
                  <div className="day-grid-item highlight-item">
                    <span className="grid-item-label">Fajr</span>
                    <span className="grid-item-val font-bold text-primary">{formatTo12HourDisplay(activeDayData.timings.fajr)}</span>
                  </div>
                  <div className="day-grid-item">
                    <span className="grid-item-label">Zawal</span>
                    <span className="grid-item-val">{formatTo12HourDisplay(activeDayData.timings.zawal)}</span>
                  </div>
                  <div className="day-grid-item">
                    <span className="grid-item-label">Asr</span>
                    <span className="grid-item-val">{formatTo12HourDisplay(activeDayData.timings.asr)}</span>
                  </div>
                  <div className="day-grid-item highlight-item">
                    <span className="grid-item-label">Maghrib</span>
                    <span className="grid-item-val font-bold text-primary">{formatTo12HourDisplay(activeDayData.timings.maghrib)}</span>
                  </div>
                  <div className="day-grid-item highlight-item">
                    <span className="grid-item-label">Isha</span>
                    <span className="grid-item-val font-bold text-primary">{formatTo12HourDisplay(activeDayData.timings.isha)}</span>
                  </div>
                  <div className="day-grid-item">
                    <span className="grid-item-label">Sehri End</span>
                    <span className="grid-item-val">{formatTo12HourDisplay(activeDayData.timings.sehriEnd)}</span>
                  </div>
                  <div className="day-grid-item">
                    <span className="grid-item-label">Sunrise</span>
                    <span className="grid-item-val">{formatTo12HourDisplay(activeDayData.timings.tulu)}</span>
                  </div>
                  <div className="day-grid-item">
                    <span className="grid-item-label">Ishraq</span>
                    <span className="grid-item-val">{formatTo12HourDisplay(activeDayData.timings.ishraqStart)}</span>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </div>
    </section>
  );
};

export default MonthlyTimetable;
