import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawServiceAccount) {
    return res.status(500).json({ error: 'FIREBASE_SERVICE_ACCOUNT env var is missing.' });
  }

  try {
    let parsedStr = rawServiceAccount.trim();
    // If stored as base64 in Vercel, decode it automatically
    if (!parsedStr.startsWith('{')) {
      try {
        parsedStr = Buffer.from(parsedStr, 'base64').toString('utf8');
      } catch (_) {}
    }

    const serviceAccount = typeof parsedStr === 'string'
      ? JSON.parse(parsedStr)
      : parsedStr;

    const accessToken = await getAccessToken(serviceAccount);
    const projectId = serviceAccount.project_id || 'markazwalimasjid-459f6';

    const messagePayload = JSON.stringify({
      message: {
        topic: 'prayer_updates',
        notification: {
          title: '🕌 Prayer Times Updated',
          body: 'Namaz time is updated',
        },
        data: {
          type: 'PRAYER_TIME_CHANGE',
        },
      },
    });

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: messagePayload,
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error in send-fcm API:', error);
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

function createJwt(serviceAccount) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
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

  const privateKey = getFormattedPrivateKey(serviceAccount.private_key);

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(serviceAccount) {
  const jwt = createJwt(serviceAccount);
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
