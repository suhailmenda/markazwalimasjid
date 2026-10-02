import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { sendFcmBulkNotification } from './sendFcmNotification.ts';

describe('sendFcmBulkNotification', () => {
  it('sends payload with custom title and body to /api/send-fcm', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    const mockFetch = mock.fn(async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedOptions = init;
      return {
        ok: true,
        json: async () => ({ success: true, messageId: 'projects/test/messages/123' }),
      } as Response;
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const result = await sendFcmBulkNotification({
        title: '🕌 Fajr Time Updated',
        body: 'Fajr namaz time has been updated.',
      });

      assert.equal(result, true);
      assert.equal(capturedUrl, '/api/send-fcm');
      assert.equal(capturedOptions?.method, 'POST');
      assert.deepEqual(capturedOptions?.headers, {
        'Content-Type': 'application/json',
      });
      assert.equal(
        capturedOptions?.body,
        JSON.stringify({
          title: '🕌 Fajr Time Updated',
          body: 'Fajr namaz time has been updated.',
        })
      );
      assert.equal(mockFetch.mock.callCount(), 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('handles empty payload gracefully', async () => {
    let capturedBody = '';

    const mockFetch = mock.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = (init?.body as string) || '';
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as Response;
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const result = await sendFcmBulkNotification();

      assert.equal(result, true);
      assert.equal(capturedBody, JSON.stringify({}));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns false when fetch fails or response is not ok', async () => {
    const mockFetch = mock.fn(async () => {
      return {
        ok: false,
        json: async () => ({ error: 'Server error' }),
      } as Response;
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const result = await sendFcmBulkNotification({
        title: '🕌 Asr Time Updated',
        body: 'Asr namaz time has been updated.',
      });

      assert.equal(result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns false and catches network errors', async () => {
    const mockFetch = mock.fn(async () => {
      throw new Error('Network error');
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const result = await sendFcmBulkNotification({
        title: '🕌 Isha Time Updated',
        body: 'Isha namaz time has been updated.',
      });

      assert.equal(result, false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
