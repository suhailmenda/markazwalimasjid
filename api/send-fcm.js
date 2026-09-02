import crypto from 'crypto';

// Hardcoded Firebase Service Account Credentials for markazwalimasjid-459f6
const HARDCODED_SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "markazwalimasjid-459f6",
  private_key_id: "03d94dea7161431e1a02a0813ba8b67eeda13dbf",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDP8Oi9J0NZB1gB\nNGSpo4FTNSVSUeD0CL4F0qhNreJka95VmLezaC45tJfK+Mz0O8zvtBTM8jduXGbM\n3hklfjAJj6tbN5rgnf7G4V5GfoJL4LDQZ9cjaEoZOzKuORijXd1KoPmE3PSl47gO\nbAqY14ztME4vHUh3/6bfYtDCboaDjnRLoCJ42EHxriSfK6DbnQfJUyAesCRPDWhb\nW5NDr4hsV8ZaJYhcNZzsvyEY7VUgIwFgw5QRuR/l0b1oWnBMAeU7fcH9ilRvI/BY\nYLjgzOFtYXKE0fE/y9XTxl9xXnx+BTO6G76xZD2qWtr1dXfcpmPozO+Y7cKS5b87\n+N77dib9AgMBAAECggEAAnh98VUzhCBkDaojH2ucLqg6oT2bfzhDlRpx7IrG13rt\n4+6TsyO+2vcXI+LuRHw0kfI6f1trt5tkgbg5okOD1C5OdHC9lwopijj6+OK3LzDF\n/vFkfa942eqG8Bp54k8IunHMkPYKtNl26qY27nCa5FG7MSL1q/Hb1p5GNyNMvEbg\ncSrpPMvpx729nXvCa7enK0BCaXHtPDHfnZGbqOR6omwMDPNiSG+KtKUGTt1w33NR\nEayZfKibjfdbsh1OdPObtIl8q3gxE8aY9yJvMvUSl0ut7M8gsRLyGjN0lTKIFNqW\nhXRNrO7/m+ixWCYAlWY82cVx4v3/cISqeVgW+y2bvQKBgQDro6NRSl9jJl+n3HZI\ncAhGdI1DEUObMZKpkwI/hbcWOVejD6fAPoOWfVPK5VVOPK87wB4BVY7YiWbJNiOw\nk8M8+NA3K7+M/QAkr4daHrn63T8etW73wFygWkQpzzMlOJuQq2qonCN0zc61EB9s\naBAJ0Vo7hJDKlOWOXA1mZKwuNwKBgQDh6JXRFlqbmTuqXgCGQVZPmDNqrAjNNwj8\nzrHlX7EjvqNFsLsu1bhUNBbGRpJILKJWRHpiKq8P7GQtqQQ56op4qeWsw+iaXVPG\nl2FDYHs2zDm8Nl/45SPvJBt3Hm/+nx3zZjd9LwnBWQfnQj5tcxJMdCo6rOk5eH1Y\n2+SmhvzaawKBgCUvT4h2ehMFbTbqHWhU9ZlYryoUQVzuN7y2zDYF/dxt9BxxTgGS\nW+WVpXFxO0L7ZJPDP3jqbX5SQHwkJQGqb7bhdMogBzxSeIFRicR48NRbsahA7V//\nZR6Q4AzQ+7s18aakxlIRQa8fAy2je7H5wf4qoVifFNJDKO6MLDkqTdmFAoGARmxI\n98suJ79W+D8hjrijfWCG9sP2YnK7nIOatVRlVi1BnKIBWBJLygQK7XhmdZVkbdwf\nAqcnt6ELgahkpuFUlVTxQjA4PJbHXOsn6OcUwfpcLS4OMPrNfukUnsegRhG4Nn4w\n4hddxSZJ7m+aImhy1d6Io43vjnjfKmoyFy+Rd00CgYEA3apv7y4AOZVEv7EPcq5x\nKm7MPzJOSELMZ6gllpsLYXDJq67CxO2GQU3raoYjVJwHUpqVqSW7naI4AYGmlGho\n0Pjsz5A30vvwNpgugMYG/CTqS1fa3ZOhc65BxXk3MDZmpvnjZAD9evE953qR5Pz0\nsqW40UpENiwMNQTxKaluhhs=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@markazwalimasjid-459f6.iam.gserviceaccount.com",
  client_id: "104883504041705605585",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40markazwalimasjid-459f6.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    let serviceAccount = HARDCODED_SERVICE_ACCOUNT;

    const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (rawEnv && rawEnv.trim().length > 0) {
      try {
        let parsedStr = rawEnv.trim();
        if (!parsedStr.startsWith('{')) {
          parsedStr = Buffer.from(parsedStr, 'base64').toString('utf8');
        }
        serviceAccount = typeof parsedStr === 'string' ? JSON.parse(parsedStr) : parsedStr;
      } catch (err) {
        console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT env var, using hardcoded credentials:', err);
      }
    }

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
