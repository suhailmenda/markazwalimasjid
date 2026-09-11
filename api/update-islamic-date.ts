import crypto from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';
import prayerTimesData from '../src/assets/prayer_times.json' with { type: 'json' };

interface RequestWithBody extends IncomingMessage {
  method?: string;
  body?: any;
}

interface ResponseWithJson extends ServerResponse {
  status: (statusCode: number) => ResponseWithJson;
  json: (data: any) => void;
}

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

import type { DayJsonEntry } from '../src/utils/prayerStartEnd';

const prayerTimesMap = prayerTimesData as unknown as Record<string, DayJsonEntry>;

const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  "Rabi' al-Awwal",
  "Rabi' al-Thani",
  'Jumada al-Ula',
  'Jumada al-Thaniyah',
  'Rajab',
  "Sha'ban",
  'Ramadan',
  'Shawwal',
  "Dhu al-Qi'dah",
  'Dhu al-Hijjah',
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default async function handler(req: RequestWithBody, res: ResponseWithJson) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const now = new Date();

    // 1. Determine Kolkota time components (UTC+5:30)
    const kolkataOffsetMs = 5.5 * 60 * 60 * 1000;
    const kolkataNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + kolkataOffsetMs);

    const dayKey = `${kolkataNow.getDate().toString().padStart(2, '0')}-${MONTH_NAMES[kolkataNow.getMonth()]}`;
    const todayEntry = prayerTimesMap[dayKey];
    const todayMaghrib = todayEntry?.maghrib || '18:45';

    // 2. Fetch current Islamic Date from Firestore settings/islamicDateCache
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    let currentDay = 23;
    let currentMonth = 'Ramadan';
    let currentYear = 1447;
    let firestoreUpdated = false;
    let accessToken: string | null = null;

    if (projectId && clientEmail && rawPrivateKey) {
      accessToken = await getAccessToken({ clientEmail, privateKey: rawPrivateKey });

      try {
        const getRes = await fetch(
          `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/islamicDateCache`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (getRes.ok) {
          const docData = await getRes.json();
          const fields = docData.fields || {};

          if (fields.day?.integerValue) {
            currentDay = parseInt(fields.day.integerValue, 10);
          } else if (fields.day?.stringValue) {
            currentDay = parseInt(fields.day.stringValue, 10);
          }

          if (fields.month?.stringValue) {
            currentMonth = fields.month.stringValue;
          }

          if (fields.year?.integerValue) {
            currentYear = parseInt(fields.year.integerValue, 10);
          } else if (fields.year?.stringValue) {
            currentYear = parseInt(fields.year.stringValue, 10);
          }

          if (!fields.day && fields.islamicDate?.stringValue) {
            const dateStr = fields.islamicDate.stringValue;
            const dayMatch = dateStr.match(/^(\d{1,2})/);
            if (dayMatch) currentDay = parseInt(dayMatch[1], 10);
            const yearMatch = dateStr.match(/(\d{4})/);
            if (yearMatch) currentYear = parseInt(yearMatch[1], 10);
            const foundMonth = HIJRI_MONTHS.find((m) => dateStr.includes(m));
            if (foundMonth) currentMonth = foundMonth;
          }
        }
      } catch (readErr) {
        console.warn('Could not read existing islamicDateCache from Firestore, using baseline:', readErr);
      }
    }

    // 3. Advance Islamic Date manually by +1 day (No external calculation library)
    let nextDay = currentDay + 1;
    let nextMonth = currentMonth;
    let nextYear = currentYear;

    if (nextDay > 30) {
      nextDay = 1;
      const currentMonthIdx = HIJRI_MONTHS.indexOf(currentMonth);
      const nextMonthIdx = currentMonthIdx >= 0 ? (currentMonthIdx + 1) % 12 : 0;
      nextMonth = HIJRI_MONTHS[nextMonthIdx];
      if (nextMonthIdx === 0) {
        nextYear += 1;
      }
    }

    const calculatedIslamicDate = `${nextDay} ${nextMonth} ${nextYear} AH`;

    // 4. Write updated { day, month, year, islamicDate } to Firestore
    if (projectId && accessToken) {
      const dd = kolkataNow.getDate().toString().padStart(2, '0');
      const mm = (kolkataNow.getMonth() + 1).toString().padStart(2, '0');
      const yyyy = kolkataNow.getFullYear();

      const firestoreRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/settings/islamicDateCache`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fields: {
              date: { stringValue: `${dd}-${mm}-${yyyy}` },
              time: { stringValue: todayMaghrib },
              day: { integerValue: nextDay.toString() },
              month: { stringValue: nextMonth },
              year: { integerValue: nextYear.toString() },
              islamicDate: { stringValue: calculatedIslamicDate },
            },
          }),
        }
      );
      firestoreUpdated = firestoreRes.ok;
    }

    // 5. Calculate next Maghrib timestamp for self-scheduling
    const [magHour, magMin] = todayMaghrib.split(':').map(Number);
    const todayMaghribDate = new Date(kolkataNow);
    todayMaghribDate.setHours(magHour, magMin, 0, 0);
    const isAfterMaghrib = kolkataNow >= todayMaghribDate;

    const nextTargetDate = new Date(kolkataNow);
    if (isAfterMaghrib) {
      nextTargetDate.setDate(nextTargetDate.getDate() + 1);
    }
    const nextDayKey = `${nextTargetDate.getDate().toString().padStart(2, '0')}-${MONTH_NAMES[nextTargetDate.getMonth()]}`;
    const nextEntry = prayerTimesMap[nextDayKey] || todayEntry;
    const nextMaghribTime = nextEntry?.maghrib || '18:45';
    const [nextH, nextM] = nextMaghribTime.split(':').map(Number);

    // Convert next Maghrib in Kolkata (UTC+5:30) to UTC epoch seconds
    const nextKolkataTimestamp = Date.UTC(
      nextTargetDate.getFullYear(),
      nextTargetDate.getMonth(),
      nextTargetDate.getDate(),
      nextH - 5,
      nextM - 30,
      0
    );
    const nextRunEpochSeconds = Math.floor(nextKolkataTimestamp / 1000);

    // 6. Schedule next execution with Upstash QStash
    const qstashToken = process.env.QSTASH_TOKEN || "eyJVc2VySUQiOiJmYmU0ZGZlOS1iMzEwLTQzZjEtYThkNC1kMDU3ZGVlMWE0NDEiLCJQYXNzd29yZCI6ImQxNzVjNzUxZDA1NTQ5ZGViMmEyOTVhZGY5OTM2OTc2In0=";
    const qstashUrl = 'https://qstash-us-east-1.upstash.io';
    const appUrl = "https://markazwalimasjid.vercel.app";
    const destinationUrl = `${appUrl}/api/update-islamic-date`;

    let qstashScheduled = false;
    let qstashResponse = null;

    if (qstashToken) {
      const qstashRes = await fetch(`${qstashUrl}/v2/publish/${destinationUrl}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${qstashToken}`,
          'Upstash-Not-Before': nextRunEpochSeconds.toString(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: 'qstash-scheduler', scheduledFor: new Date(nextKolkataTimestamp).toISOString() }),
      });
      qstashResponse = await qstashRes.json();
      qstashScheduled = qstashRes.ok;
    }

    return res.status(200).json({
      success: true,
      islamicDate: calculatedIslamicDate,
      firestoreUpdated,
      qstashScheduled,
      nextScheduledRun: new Date(nextKolkataTimestamp).toISOString(),
      qstashResponse,
    });
  } catch (error: any) {
    console.error('Error updating Islamic Date / scheduling QStash:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getFormattedPrivateKey(key: string): string {
  if (!key) return '';
  let formatted = key.replace(/\\n/g, '\n');
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.slice(1, -1);
  }
  return formatted;
}

function createJwt({ clientEmail, privateKey }: ServiceAccountCredentials): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;
  const formattedKey = getFormattedPrivateKey(privateKey);

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(formattedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(creds: ServiceAccountCredentials): Promise<string> {
  const jwt = createJwt(creds);
  const postData = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData,
  });

  const parsed = await res.json();
  if (parsed.access_token) {
    return parsed.access_token;
  }
  throw new Error(`Failed to get access token: ${JSON.stringify(parsed)}`);
}
