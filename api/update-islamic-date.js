import crypto from 'crypto';
import prayerTimesData from '../src/assets/prayer_times.json' with { type: 'json' };

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

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const now = new Date();

    // 1. Determine Kolkota time components (UTC+5:30)
    const kolkataOffsetMs = 5.5 * 60 * 60 * 1000;
    const kolkataNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + kolkataOffsetMs);

    const dayKey = `${kolkataNow.getDate().toString().padStart(2, '0')}-${MONTH_NAMES[kolkataNow.getMonth()]}`;
    const todayEntry = prayerTimesData[dayKey];
    const todayMaghrib = todayEntry?.maghrib || '18:45';

    // 2. Calculate current active Islamic Date (Advances +1 day at Maghrib)
    const [magHour, magMin] = todayMaghrib.split(':').map(Number);
    const todayMaghribDate = new Date(kolkataNow);
    todayMaghribDate.setHours(magHour, magMin, 0, 0);

    const isAfterMaghrib = kolkataNow >= todayMaghribDate;
    const targetDateForHijri = new Date(kolkataNow);
    if (isAfterMaghrib) {
      targetDateForHijri.setDate(targetDateForHijri.getDate() + 1);
    }

    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = formatter.formatToParts(targetDateForHijri);
    const hijriDay = parts.find((p) => p.type === 'day')?.value || '1';
    const hijriMonthNum = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
    const hijriYear = parts.find((p) => p.type === 'year')?.value || '1448';
    const hijriMonthName = HIJRI_MONTHS[hijriMonthNum - 1] || 'Muharram';
    const calculatedIslamicDate = `${hijriDay} ${hijriMonthName} ${hijriYear} AH`;

    // 3. Write to Firestore settings/islamicDateCache
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    let firestoreUpdated = false;
    if (projectId && clientEmail && rawPrivateKey) {
      const accessToken = await getAccessToken({ clientEmail, privateKey: rawPrivateKey });
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
              islamicDate: { stringValue: calculatedIslamicDate },
            },
          }),
        }
      );
      firestoreUpdated = firestoreRes.ok;
    }

    // 4. Calculate next Maghrib timestamp for self-scheduling
    // If we've reached/passed today's Maghrib, next run is tomorrow's Maghrib. Otherwise today's Maghrib.
    const nextTargetDate = new Date(kolkataNow);
    if (isAfterMaghrib) {
      nextTargetDate.setDate(nextTargetDate.getDate() + 1);
    }
    const nextDayKey = `${nextTargetDate.getDate().toString().padStart(2, '0')}-${MONTH_NAMES[nextTargetDate.getMonth()]}`;
    const nextEntry = prayerTimesData[nextDayKey] || todayEntry;
    const nextMaghribTime = nextEntry.maghrib || '18:45';
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

    // 5. Schedule next execution with Upstash QStash
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
  } catch (error) {
    console.error('Error updating Islamic Date / scheduling QStash:', error);
    return res.status(500).json({ error: error.message });
  }
}

function getFormattedPrivateKey(key) {
  if (!key) return '';
  let formatted = key.replace(/\\n/g, '\n');
  if (formatted.startsWith('"') && formatted.endsWith('"')) {
    formatted = formatted.slice(1, -1);
  }
  return formatted;
}

function createJwt({ clientEmail, privateKey }) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj) =>
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

async function getAccessToken(creds) {
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
