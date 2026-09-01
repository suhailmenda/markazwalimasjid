/**
 * Calls the Vercel API endpoint (/api/send-fcm) to broadcast a bulk push notification
 * to all mobile app users whenever prayer times are updated in the Web Admin panel.
 */
export const sendFcmBulkNotification = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/send-fcm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('FCM Bulk Push Broadcast Result via Vercel API:', data);
    return response.ok;
  } catch (error) {
    console.error('Error sending FCM bulk notification via Vercel API:', error);
    return false;
  }
};
