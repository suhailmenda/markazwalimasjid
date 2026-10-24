import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getISTDate, parseTimeToToday, IST_OFFSET_MS } from './timeFormat.ts';
import { getTodayPrayerStartEndMap } from './prayerStartEnd.ts';

describe('IST Time & Date Utils', () => {
  it('correctly shifts date to IST regardless of client timezone', () => {
    // 2026-10-23 01:00:00 UTC corresponds to 2026-10-23 06:30:00 IST
    const utcInstant = new Date('2026-10-23T01:00:00.000Z');
    const istDate = getISTDate(utcInstant);

    assert.equal(istDate.getUTCFullYear(), 2026);
    assert.equal(istDate.getUTCMonth(), 9); // October (0-indexed)
    assert.equal(istDate.getUTCDate(), 23);
    assert.equal(istDate.getUTCHours(), 6);
    assert.equal(istDate.getUTCMinutes(), 30);
  });

  it('correctly parses prayer time into exact IST UTC epoch', () => {
    // Reference instant: 2026-10-23 06:30:00 IST (01:00 UTC)
    const refInstant = new Date('2026-10-23T01:00:00.000Z');

    // Parse "5:12 am" for today (IST)
    const fajr = parseTimeToToday('5:12 am', refInstant);
    // 5:12 AM IST on 2026-10-23 corresponds to 2026-10-22 23:42:00 UTC
    assert.equal(fajr.toISOString(), '2026-10-22T23:42:00.000Z');

    // Difference between 6:30 AM IST and 5:12 AM IST should be exactly 78 minutes (4,680,000 ms)
    const diffMs = refInstant.getTime() - fajr.getTime();
    assert.equal(diffMs, 78 * 60 * 1000);
  });

  it('loads prayer start and end map for Silvassa date across timezones', () => {
    // Suppose in Canada (e.g. Vancouver) it is Oct 22 evening (1:30 PM PDT / 20:30 UTC),
    // but in Silvassa it is already Oct 23 early morning (2:00 AM IST).
    const canadaInstant = new Date('2026-10-22T20:30:00.000Z');
    const { raw } = getTodayPrayerStartEndMap(canadaInstant);

    // Verify it loads 23-Oct from prayer_times.json, NOT 22-Oct
    const istDate = getISTDate(canadaInstant);
    assert.equal(istDate.getUTCDate(), 23);
    assert.equal(istDate.getUTCMonth(), 9); // October
    assert.ok(raw.fajr, 'Raw entry for today in Silvassa exists');
  });
});
