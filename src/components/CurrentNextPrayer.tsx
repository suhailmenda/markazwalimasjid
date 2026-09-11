import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import type { ManualTimes, PrayerName } from '../types/prayer';
import { getTodayPrayerStartEndMap } from '../utils/prayerStartEnd';
import { formatTo12HourDisplay, parseTimeToToday } from '../utils/timeFormat';
import './CurrentNextPrayer.css';

interface CurrentNextPrayerProps {
  manualTimes: ManualTimes;
  currentTime?: Date;
}

interface TimeRemaining {
  hours: number;
  minutes: number;
  seconds: number;
}

interface PrayerStatus {
  isMakruh: boolean;
  makruhTitle?: string;
  makruhDescription?: string;
  progressPercent: number;
  current: {
    name: string;
    startTimeDisplay: string;
    endTimeDisplay: string;
    timeLeft: TimeRemaining;
  };
  next: {
    name: PrayerName | string;
    startTimeDisplay: string;
    jamaatTimeDisplay: string;
    timeLeft: TimeRemaining;
  };
}

const calculateTimeRemaining = (targetDate: Date, now: Date): TimeRemaining => {
  const diffMs = targetDate.getTime() - now.getTime();
  const totalSec = Math.max(0, Math.ceil(diffMs / 1000));

  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  return { hours, minutes, seconds };
};

const calcProgress = (startTime: Date, endTime: Date, now: Date): number => {
  const total = endTime.getTime() - startTime.getTime();
  const current = now.getTime() - startTime.getTime();
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((current / total) * 100)));
};

const getPrayerStatus = (now: Date, manualTimes: ManualTimes): PrayerStatus => {
  const todayInfo = getTodayPrayerStartEndMap(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowInfo = getTodayPrayerStartEndMap(tomorrowDate);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayInfo = getTodayPrayerStartEndMap(yesterdayDate);

  const subahSadiqToday = parseTimeToToday(todayInfo.raw.subahSadiq, now);
  const tuluToday = parseTimeToToday(todayInfo.raw.tulu, now);
  const ishraqStartToday = parseTimeToToday(todayInfo.raw.ishraqStart, now);
  const zawalStartToday = parseTimeToToday(todayInfo.raw.zawalStart, now);
  const zawalEndToday = parseTimeToToday(todayInfo.raw.zawalEnd, now);
  const asrStartToday = parseTimeToToday(todayInfo.raw.asr, now);
  const asrEndToday = parseTimeToToday(todayInfo.raw.asrEnd, now);
  const maghribStartToday = parseTimeToToday(todayInfo.raw.maghrib, now);
  const ishaStartToday = parseTimeToToday(todayInfo.raw.isha, now);

  const ishaStartYesterday = parseTimeToToday(yesterdayInfo.raw.isha, yesterdayDate);
  const subahSadiqTomorrow = parseTimeToToday(tomorrowInfo.raw.subahSadiq, tomorrowDate);
  const ishraqEndToday = parseTimeToToday(todayInfo.raw.ishraqEnd, now);
  const chashtStartToday = parseTimeToToday(todayInfo.raw.chashtStart, now);

  const safeManual = manualTimes || {};

  // 1. Midnight to Subah Sadiq (Isha)
  if (now < subahSadiqToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(ishaStartYesterday, subahSadiqToday, now),
      current: {
        name: 'Isha',
        startTimeDisplay: formatTo12HourDisplay(yesterdayInfo.raw.isha),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.subahSadiq),
        timeLeft: calculateTimeRemaining(subahSadiqToday, now),
      },
      next: {
        name: 'Fajr',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.subahSadiq),
        jamaatTimeDisplay: formatTo12HourDisplay(safeManual.Fajr?.jamat),
        timeLeft: calculateTimeRemaining(subahSadiqToday, now),
      },
    };
  }

  // 1. Fajr (Subah Sadiq to Tulu)
  if (now >= subahSadiqToday && now < tuluToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(subahSadiqToday, tuluToday, now),
      current: {
        name: 'Fajr',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.subahSadiq),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.tulu),
        timeLeft: calculateTimeRemaining(tuluToday, now),
      },
      next: {
        name: 'Makruh (After tulu)',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.tulu),
        jamaatTimeDisplay: '',
        timeLeft: calculateTimeRemaining(tuluToday, now),
      },
    };
  }

  // 2. Makruh (After tulu) (Tulu to Ishraq Start)
  if (now >= tuluToday && now < ishraqStartToday) {
    return {
      isMakruh: true,
      makruhTitle: 'Makruh (After tulu)',
      makruhDescription: 'Prohibited to offer Salah or Sajdah until Ishraq begins.',
      progressPercent: calcProgress(tuluToday, ishraqStartToday, now),
      current: {
        name: 'Makruh (After tulu)',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.tulu),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.ishraqStart),
        timeLeft: calculateTimeRemaining(ishraqStartToday, now),
      },
      next: {
        name: 'Ishraq',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.ishraqStart),
        jamaatTimeDisplay: '',
        timeLeft: calculateTimeRemaining(ishraqStartToday, now),
      },
    };
  }

  // 3. Ishraq (Ishraq Start to Ishraq End / Chasht Start)
  if (now >= ishraqStartToday && now < ishraqEndToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(ishraqStartToday, ishraqEndToday, now),
      current: {
        name: 'Ishraq',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.ishraqStart),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.ishraqEnd),
        timeLeft: calculateTimeRemaining(ishraqEndToday, now),
      },
      next: {
        name: 'Chast',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.chashtStart),
        jamaatTimeDisplay: '',
        timeLeft: calculateTimeRemaining(ishraqEndToday, now),
      },
    };
  }

  // 4. Chast (Chasht Start to Zawal Start)
  if (now >= ishraqEndToday && now < zawalStartToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(ishraqEndToday, zawalStartToday, now),
      current: {
        name: 'Chast',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.chashtStart),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.zawalStart),
        timeLeft: calculateTimeRemaining(zawalStartToday, now),
      },
      next: {
        name: 'Makruh (Zawal)',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.zawalStart),
        jamaatTimeDisplay: '',
        timeLeft: calculateTimeRemaining(zawalStartToday, now),
      },
    };
  }

  // 5. Makruh (Zawal) (Zawal Start to Zawal End)
  if (now >= zawalStartToday && now < zawalEndToday) {
    return {
      isMakruh: true,
      makruhTitle: 'Makruh (Zawal)',
      makruhDescription: 'Sun is at meridian (Nisf an-Nahar). Salah is prohibited until Dhuhr starts.',
      progressPercent: calcProgress(zawalStartToday, zawalEndToday, now),
      current: {
        name: 'Makruh (Zawal)',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.zawalStart),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.zawalEnd),
        timeLeft: calculateTimeRemaining(zawalEndToday, now),
      },
      next: {
        name: 'Dhuhr',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.zawalEnd),
        jamaatTimeDisplay: formatTo12HourDisplay(safeManual.Dhuhr?.jamat),
        timeLeft: calculateTimeRemaining(zawalEndToday, now),
      },
    };
  }

  // 6. Dhuhr (Zawal End to Asr Start)
  if (now >= zawalEndToday && now < asrStartToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(zawalEndToday, asrStartToday, now),
      current: {
        name: 'Dhuhr',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.zawalEnd),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.asr),
        timeLeft: calculateTimeRemaining(asrStartToday, now),
      },
      next: {
        name: 'Asr',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.asr),
        jamaatTimeDisplay: formatTo12HourDisplay(safeManual.Asr?.jamat),
        timeLeft: calculateTimeRemaining(asrStartToday, now),
      },
    };
  }

  // 7. Asr (Asr Start to Asr End)
  if (now >= asrStartToday && now < asrEndToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(asrStartToday, asrEndToday, now),
      current: {
        name: 'Asr',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.asr),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.asrEnd),
        timeLeft: calculateTimeRemaining(asrEndToday, now),
      },
      next: {
        name: 'Makruh (Before Gurub)',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.asrEnd),
        jamaatTimeDisplay: '',
        timeLeft: calculateTimeRemaining(asrEndToday, now),
      },
    };
  }

  // 8. Makruh (Before Gurub) (Asr End to Maghrib Start)
  if (now >= asrEndToday && now < maghribStartToday) {
    return {
      isMakruh: true,
      makruhTitle: 'Makruh (Before Gurub)',
      makruhDescription: 'Asr time has expired. Voluntary prayers prohibited until Maghrib.',
      progressPercent: calcProgress(asrEndToday, maghribStartToday, now),
      current: {
        name: 'Makruh (Before Gurub)',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.asrEnd),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.maghrib),
        timeLeft: calculateTimeRemaining(maghribStartToday, now),
      },
      next: {
        name: 'Maghrib',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.maghrib),
        jamaatTimeDisplay: 'After Azaan',
        timeLeft: calculateTimeRemaining(maghribStartToday, now),
      },
    };
  }

  // 9. Maghrib (Maghrib Start to Isha Start)
  if (now >= maghribStartToday && now < ishaStartToday) {
    return {
      isMakruh: false,
      progressPercent: calcProgress(maghribStartToday, ishaStartToday, now),
      current: {
        name: 'Maghrib',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.maghrib),
        endTimeDisplay: formatTo12HourDisplay(todayInfo.raw.isha),
        timeLeft: calculateTimeRemaining(ishaStartToday, now),
      },
      next: {
        name: 'Isha',
        startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.isha),
        jamaatTimeDisplay: formatTo12HourDisplay(safeManual.Isha?.jamat),
        timeLeft: calculateTimeRemaining(ishaStartToday, now),
      },
    };
  }

  // 10. Isha (Isha Start to Subah Sadiq Tomorrow)
  return {
    isMakruh: false,
    progressPercent: calcProgress(ishaStartToday, subahSadiqTomorrow, now),
    current: {
      name: 'Isha',
      startTimeDisplay: formatTo12HourDisplay(todayInfo.raw.isha),
      endTimeDisplay: formatTo12HourDisplay(tomorrowInfo.raw.subahSadiq),
      timeLeft: calculateTimeRemaining(subahSadiqTomorrow, now),
    },
    next: {
      name: 'Fajr',
      startTimeDisplay: formatTo12HourDisplay(tomorrowInfo.raw.subahSadiq),
      jamaatTimeDisplay: formatTo12HourDisplay(safeManual.Fajr?.jamat),
      timeLeft: calculateTimeRemaining(subahSadiqTomorrow, now),
    },
  };
};

const CurrentNextPrayer: React.FC<CurrentNextPrayerProps> = ({ manualTimes, currentTime }) => {
  const [internalNow, setInternalNow] = useState<Date>(() => currentTime || new Date());

  useEffect(() => {
    if (currentTime) return;
    const timer = setInterval(() => setInternalNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [currentTime]);

  const now = currentTime || internalNow;
  const status = useMemo(() => getPrayerStatus(now, manualTimes), [now, manualTimes]);

  return (
    <div className={`cnp-card ${status.isMakruh ? 'cnp-is-makruh' : ''}`}>
      {/* 1. Top Bar: Start Time | Active Badge | End Time */}
      <div className="cnp-top-bar">
        <div className="cnp-time-endpoint start">
          <span className="cnp-time-label">Start</span>
          <span className="cnp-time-value">{status.current.startTimeDisplay}</span>
        </div>

        <div className="cnp-active-badge">
          <span className="cnp-dot" />
          <span className="cnp-active-lead">Active:</span>
          <span className="cnp-active-title">{status.current.name}</span>
        </div>

        <div className="cnp-time-endpoint end">
          <span className="cnp-time-label">End</span>
          <span className="cnp-time-value">{status.current.endTimeDisplay}</span>
        </div>
      </div>

      {/* 2. Makruh Warning Alert (Conditional) */}
      {status.isMakruh && (
        <div className="cnp-makruh-banner">
          <ShieldAlert size={16} className="cnp-makruh-icon" />
          <div className="cnp-makruh-text">
            <strong>{status.makruhTitle}:</strong> {status.makruhDescription}
          </div>
        </div>
      )}

      {/* 3. Gold Progress Bar */}
      <div className="cnp-progress-track">
        <div
          className="cnp-progress-fill"
          style={{ width: `${status.progressPercent}%` }}
        />
      </div>

      {/* 4. Full-Row Countdown Row (Next Name starts in + Timer in same line) */}
      <div className="cnp-countdown-hero">
        <div className="cnp-hero-same-line">
          <span className="cnp-hero-label">
            <strong className="cnp-hero-prayer-name">{status.next.name}</strong> starts in
          </span>

          <div className="cnp-hero-timer-display">
            <div className="cnp-digit-card">
              <span className="cnp-digit-number">
                {status.next.timeLeft.hours.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="cnp-digit-separator">:</span>
            <div className="cnp-digit-card">
              <span className="cnp-digit-number">
                {status.next.timeLeft.minutes.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="cnp-digit-separator">:</span>
            <div className="cnp-digit-card">
              <span className="cnp-digit-number">
                {status.next.timeLeft.seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrentNextPrayer;
