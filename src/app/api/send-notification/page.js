// pages/api/send-notification.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { userId, seatNumber } = req.body;
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!userId || !seatNumber || !accessToken) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: `ยินดีต้อนรับ! คุณได้ที่นั่งหมายเลข: ${seatNumber}`,
          },
        ],
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send message');
    }

    res.status(200).json({ message: 'Notification sent successfully!' });
  } catch (error) {
    console.error('Error sending LINE message:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
}