import type { IncomingMessage, ServerResponse } from 'http';
import { sendFcmTopicMessage } from './send-fcm';

interface RequestWithHeaders extends IncomingMessage {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
}

interface ResponseWithJson extends ServerResponse {
  status: (statusCode: number) => ResponseWithJson;
  json: (data: any) => void;
}

export default async function handler(req: RequestWithHeaders, res: ResponseWithJson) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const expectedKey = process.env.ADMIN_API_KEY || 'markaz-secret-2026';
  const providedKey = req.headers['x-admin-key'];

  if (!providedKey || providedKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing x-admin-key header' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const title = typeof payload.title === 'string' && payload.title.trim()
      ? payload.title.trim()
      : '🕌 Markaz Wali Masjid Notification';
    const body = typeof payload.body === 'string' ? payload.body.trim() : '';

    if (!body) {
      return res.status(400).json({ error: 'Missing required field: body' });
    }

    const result = await sendFcmTopicMessage({
      title,
      body,
      data: payload.data || { type: 'MANUAL_NOTIFICATION' },
    });

    return res.status(result.status).json(result.data);
  } catch (error: any) {
    console.error('Error in send-manual-notification API:', error);
    return res.status(500).json({ error: error.message });
  }
}
