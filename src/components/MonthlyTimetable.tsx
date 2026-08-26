import React, { useState, useMemo } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
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

  return (
    <section id="monthly-schedule" className="section-padding monthly-schedule-section">
      <div className="container">
        <div className="section-header text-center">
          <h2 className="section-title">Monthly Prayer Timetable</h2>
          <p className="monthly-subtitle">Complete yearly schedule for Silvassa</p>
        </div>

        <div className="monthly-timetable-card">
          
          {/* Month Selector Header */}
          <div className="month-selector-header">
            <div className="month-selector-title">
              <Calendar size={20} className="text-gold" />
              <span>Select Month:</span>
            </div>

            {/* Desktop Month Pills */}
            <div className="month-pills-desktop">
              {MONTHS.map((month) => (
                <button
                  key={month.code}
                  onClick={() => setSelectedMonthCode(month.code)}
                  className={`month-pill ${selectedMonthCode === month.code ? 'active' : ''}`}
                >
                  {month.code}
                </button>
              ))}
            </div>

            {/* Mobile Dropdown Select */}
            <div className="month-select-mobile-wrapper">
              <select
                value={selectedMonthCode}
                onChange={(e) => setSelectedMonthCode(e.target.value)}
                className="month-select-mobile"
              >
                {MONTHS.map((month) => (
                  <option key={month.code} value={month.code}>
                    {month.name} ({month.code})
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="month-select-arrow" />
            </div>
          </div>

          <div className="table-header-info">
            <h3 className="month-heading">{selectedMonthObj.name} Schedule</h3>
            <div className="table-meta-badges">
              <span className="scroll-hint-badge">← Swipe to view →</span>
              <span className="days-count-badge">{monthData.length} Days</span>
            </div>
          </div>

          {/* Timetable Data Table */}
          <div className="monthly-table-responsive">
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
                  const isToday =
                    MONTHS[currentMonthIndex]?.code === selectedMonthCode &&
                    dayNumber === currentDayNum;

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

        </div>
      </div>
    </section>
  );
};

export default MonthlyTimetable;
